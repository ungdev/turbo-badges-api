import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import PDFkit from 'pdfkit';
import sharp from 'sharp';

import { PrismaService } from 'prisma/prisma.service';
import { AccessImageFiles, AccessImageProfile, BadgeItem, BadgeOptions, Option } from 'src/badges/badges.model';
import { FileUploadService } from 'src/file-upload/file-upload.service';

@Injectable()
export class BadgesService {
    private readonly PDF_CONFIG = {
        fontFamily: path.join(process.cwd(), 'assets', 'badges', 'font.ttf'),
        fontSize: 16,
        pictureSize: 170,
        pictureX: 50,
        pictureY: 20,
        textX: 135,
        textY: 505,
        columns: 4,
        rows: 2,
        columnOffset: 190,
        rowOffset: 280,
        a4Width: 841.89,
    };

    private readonly OPTION_MODELS = {
        commission: 'commission',
        grade: 'grade',
        access: 'access',
    } as const;

    constructor(
        private prisma: PrismaService,
        private fileUploadService: FileUploadService
    ) { }

    async getOptions(userId: string): Promise<BadgeOptions> {
        return {
            commissions: await this.prisma.commission.findMany({
                select: {
                    id: true,
                    name: true,
                },
            }),
            grades: await this.prisma.grade.findMany({
                select: {
                    id: true,
                    name: true,
                },
            }),
            accesses: await this.prisma.access.findMany({
                select: {
                    id: true,
                    name: true,
                    accessImages: {
                        where: {
                            userId: userId
                        },
                        select: {
                            frontPictureFilename: true,
                            backPictureFilename: true
                        }
                    }
                }
            }),
        };
    }

    async postOption(type: string, name: string) {
        if (!this.OPTION_MODELS[type as keyof typeof this.OPTION_MODELS]) {
            throw new Error('Type d\'option invalide');
        }

        const created = await (this.prisma as any)[type].create({ data: { name } });
        return this.mapObjectsToOption(created);
    }

    async deleteOption(type: string, id: string) {
        if (!this.OPTION_MODELS[type as keyof typeof this.OPTION_MODELS]) {
            throw new Error('Type d\'option invalide');
        }

        // Cas spécial pour 'access' : nettoyer les fichiers et images associés
        if (type === 'access') {
            await this.deleteAccessFiles(id);
        }

        return (this.prisma as any)[type].delete({ where: { id } });
    }

    private async deleteAccessFiles(accessId: string): Promise<void> {
        const accessImages = await this.prisma.accessImage.findMany({
            where: { accessId },
            select: {
                frontPictureFilename: true,
                backPictureFilename: true,
            },
        });

        for (const img of accessImages) {
            if (img.frontPictureFilename) {
                await this.fileUploadService.deleteFile(img.frontPictureFilename, 'badges');
            }
            if (img.backPictureFilename) {
                await this.fileUploadService.deleteFile(img.backPictureFilename, 'badges');
            }
        }

        await this.prisma.accessImage.deleteMany({ where: { accessId } });
    }

    async updateAccessImage(userId: string, accessId: string, filename: string, side: string): Promise<AccessImageProfile> {
        const accessImage = await this.prisma.accessImage.upsert({
            where: { accessId_userId: { accessId, userId } },
            update: {
                ...(side === 'front' && { frontPictureFilename: filename }),
                ...(side === 'back' && { backPictureFilename: filename }),
            },
            create: {
                accessId,
                userId,
                ...(side === 'front' && { frontPictureFilename: filename }),
                ...(side === 'back' && { backPictureFilename: filename }),
            },
        });
        return this.mapAccessImageToAccessImageProfile(accessImage);
    }

    async deleteAccessImage(userId: string, accessId: string, side: string): Promise<AccessImageProfile | undefined> {
        const accessImage = await this.prisma.accessImage.findUnique({
            where: { accessId_userId: { accessId, userId } },
            select: {
                frontPictureFilename: true,
                backPictureFilename: true
            },
        });

        if (!accessImage) {
            return undefined;
        }

        if (side === 'front') {
            if (!accessImage.frontPictureFilename) return undefined;
            await this.fileUploadService.deleteFile(accessImage.frontPictureFilename, "badges");
            await this.prisma.accessImage.update({
                where: { accessId_userId: { accessId, userId } },
                data: { frontPictureFilename: null },
            });
        } else if (side === 'back') {
            if (!accessImage.backPictureFilename) return undefined;
            await this.fileUploadService.deleteFile(accessImage.backPictureFilename, "badges");
            await this.prisma.accessImage.update({
                where: { accessId_userId: { accessId, userId } },
                data: { backPictureFilename: null },
            });
        } else {
            throw new Error('Side must be "front" or "back"');
        }

        return this.mapAccessImageToAccessImageProfile(accessImage);
    }

    private mapAccessImageToAccessImageProfile(obj: any): AccessImageProfile {
        return {
            accessId: obj.accessId,
            frontPictureFilename: obj.frontPictureFilename,
            backPictureFilename: obj.backPictureFilename
        }
    }

    private mapObjectsToOption(obj: any): Option {
        return {
            id: obj.id,
            name: obj.name,
        }
    }

    private async getDifferentAccessesFromRequests(
        requests: Array<{ userId: string; gradeId: string; commissionId: string; accessId: string }>,
        requesterUserId: string,
    ): Promise<AccessImageFiles> {
        const uniqueAccessIds = [...new Set(requests.map(r => r.accessId))];

        const accessImages = await this.prisma.accessImage.findMany({
            where: {
                accessId: { in: uniqueAccessIds },
                userId: requesterUserId,
            },
            select: {
                accessId: true,
                frontPictureFilename: true,
                backPictureFilename: true,
            },
        });

        const accessesDict: AccessImageFiles = {};

        for (const accessId of uniqueAccessIds) {
            const ai = accessImages.find(img => img.accessId === accessId);

            if (!ai || !ai.frontPictureFilename || !ai.backPictureFilename) {
                throw new NotFoundException(`One or more access image is missing.`);
            }

            accessesDict[accessId] = {
                frontPictureFilename: ai.frontPictureFilename,
                backPictureFilename: ai.backPictureFilename
            };
        }

        return accessesDict;
    }

    private async getDifferentCommissionsFromRequests(
        requests: Array<{ userId: string; gradeId: string; commissionId: string; accessId: string }>,
    ): Promise<Record<string, { name: string }>> {
        const uniqueCommissionIds = [...new Set(requests.map(r => r.commissionId))];

        const commissions = await this.prisma.commission.findMany({
            where: { id: { in: uniqueCommissionIds } },
            select: { id: true, name: true },
        });

        if (commissions.length !== uniqueCommissionIds.length) {
            const foundIds = new Set(commissions.map(c => c.id));
            const missingId = uniqueCommissionIds.find(id => !foundIds.has(id));
            throw new NotFoundException(`No commission found for id ${missingId}`);
        }

        const commissionsDict: Record<string, { name: string }> = {};
        for (const c of commissions) {
            commissionsDict[c.id] = { name: c.name };
        }

        return commissionsDict;
    }

    private async getDifferentGradesFromRequests(
        requests: Array<{ userId: string; gradeId: string; commissionId: string; accessId: string }>,
    ): Promise<Record<string, { name: string }>> {
        const uniqueGradeIds = [...new Set(requests.map(r => r.gradeId))];

        const grades = await this.prisma.grade.findMany({
            where: { id: { in: uniqueGradeIds } },
            select: { id: true, name: true },
        });

        if (grades.length !== uniqueGradeIds.length) {
            const foundIds = new Set(grades.map(g => g.id));
            const missingId = uniqueGradeIds.find(id => !foundIds.has(id));
            throw new NotFoundException(`No grade found for id ${missingId}`);
        }

        const gradesDict: Record<string, { name: string }> = {};
        for (const g of grades) {
            gradesDict[g.id] = { name: g.name };
        }

        return gradesDict;
    }

    private computeCommissionName(commissionName: string, gradeName: string): string {
        if (commissionName.toLowerCase() === 'bureau') {
            return gradeName;
        }
        if (gradeName.toLowerCase() === 'responsable') {
            return `Respo ${commissionName}`;
        }
        return commissionName;
    }

    private async renderBadgeFront(
        document: PDFKit.PDFDocument,
        toBadgeItems: BadgeItem[],
        accesses: AccessImageFiles,
        page: number,
    ): Promise<void> {
        const { columns, rows, pictureX, pictureY, pictureSize, columnOffset, rowOffset } = this.PDF_CONFIG;

        for (let col = 0; col < columns; col++) {
            for (let row = 0; row < rows; row++) {
                const index = page * columns * rows + col * rows + row;
                if (index >= toBadgeItems.length) break;

                const badgeItem = toBadgeItems[index];
                const x = pictureX + col * columnOffset;
                const y = pictureY + row * rowOffset;

                if (badgeItem.imageFilename) {
                    const photo = await this.resolveUserPhoto(badgeItem.imageFilename);
                    document.image(photo, x + 45, y + 30, { width: pictureSize - 90 });
                }

                const background = await this.fetchAccessAsset(badgeItem.accessId, 'front', accesses);
                document.image(background, x, y, { width: pictureSize });
            }
        }
    }

    private renderBadgeText(
        document: PDFKit.PDFDocument,
        toBadgeItems: BadgeItem[],
        page: number,
    ): void {
        const { columns, rows, textX, textY, columnOffset, rowOffset, fontFamily, fontSize } = this.PDF_CONFIG;

        for (let col = 0; col < columns; col++) {
            for (let row = 0; row < rows; row++) {
                const index = page * columns * rows + col * rows + row;
                if (index >= toBadgeItems.length) break;

                const textFormat = document.font(fontFamily).fillColor('white').fontSize(fontSize);

                const lastName = `${toBadgeItems[index].lastName ?? ' '}`;
                const firstName = `${toBadgeItems[index].firstName ?? ' '}`;
                const offsetX = textX + col * columnOffset;
                const offsetY = textY + row * rowOffset;

                const lastNameHeight = textFormat.heightOfString(lastName);
                textFormat.text(
                    lastName.toUpperCase(),
                    offsetX - textFormat.widthOfString(lastName.toUpperCase()) / 2,
                    offsetY - 282 - lastNameHeight / 2
                );

                const firstNameHeight = textFormat.heightOfString(firstName);
                textFormat.text(
                    firstName.toUpperCase(),
                    offsetX - textFormat.widthOfString(firstName.toUpperCase()) / 2,
                    offsetY - 273 - lastNameHeight - firstNameHeight / 2
                );

                const commission = `${toBadgeItems[index].commissionName?.toUpperCase() ?? ''}`;
                textFormat.text(
                    commission,
                    offsetX - textFormat.widthOfString(commission) / 2,
                    offsetY - 280 - lastNameHeight - firstNameHeight - firstNameHeight / 2
                );
            }
        }
    }

    private async renderBadgeBack(
        document: PDFKit.PDFDocument,
        toBadgeItems: BadgeItem[],
        accesses: AccessImageFiles,
        page: number,
    ): Promise<void> {
        const { columns, rows, pictureX, pictureY, pictureSize, columnOffset, rowOffset, a4Width } = this.PDF_CONFIG;
        const pictureX2 = a4Width - pictureX;

        for (let col = 0; col < columns; col++) {
            for (let row = 0; row < rows; row++) {
                const index = page * columns * rows + col * rows + row;
                if (index >= toBadgeItems.length) break;

                const x = pictureX2 - pictureSize - col * columnOffset;
                const y = pictureY + row * rowOffset;

                const badgeItem = toBadgeItems[index];
                const backBuffer = await this.fetchAccessAsset(badgeItem.accessId, 'back', accesses);
                document.image(backBuffer, x, y, { width: pictureSize });
            }
        }
    }

    async generateBadgesPdf(
        requests: Array<{ userId: string; gradeId: string; commissionId: string; accessId: string }>,
        requesterUserId: string,
    ) {
        const accesses = await this.getDifferentAccessesFromRequests(requests, requesterUserId);
        const commissions = await this.getDifferentCommissionsFromRequests(requests);
        const grades = await this.getDifferentGradesFromRequests(requests);

        const uniqueUserIds = [...new Set(requests.map(r => r.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: uniqueUserIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                pictureFilename: true,
            },
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        const toBadgeItems: BadgeItem[] = requests.map((r) => {
            const user = userMap.get(r.userId);
            const commission = commissions[r.commissionId];
            const grade = grades[r.gradeId];

            if (!user) {
                throw new NotFoundException(`No user found for id ${r.userId}`);
            }

            return {
                userId: r.userId,
                accessId: r.accessId,
                firstName: user.firstName,
                lastName: user.lastName,
                commissionName: this.computeCommissionName(commission.name, grade.name),
                imageFilename: user.pictureFilename,
            };
        });

        const { columns, rows } = this.PDF_CONFIG;
        const pdf = await new Promise<Buffer>(async (resolve, reject) => {
            const document = new PDFkit({ size: 'A4', margin: 0, layout: 'landscape' });

            for (let page = 0; page < Math.ceil(toBadgeItems.length / (columns * rows)); page++) {
                // Recto - Images
                await this.renderBadgeFront(document, toBadgeItems, accesses, page);

                // Recto - Texte
                this.renderBadgeText(document, toBadgeItems, page);

                // Verso
                document.addPage();
                await this.renderBadgeBack(document, toBadgeItems, accesses, page);

                if (page * columns * rows + columns * rows < toBadgeItems.length) {
                    document.addPage();
                }
            }

            document.end();
            const buffers: Buffer[] = [];
            document.on('data', (b) => buffers.push(b));
            document.on('end', () => resolve(Buffer.concat(buffers)));
            document.on('error', reject);
        });

        return { filename: `badges.pdf`, content: pdf };
    }

    // ====== Helpers fichiers/images ======
    private async defaultBlank(): Promise<Buffer> {
        try {
            return readFileSync(path.join(process.cwd(), 'assets', 'badges', 'blank.png'));
        } catch {
            return await this.createSolidPlaceholder();
        }
    }

    private isWebP(buf: Buffer) {
        return buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
    }

    private async safeLoadLocalFile(p: string): Promise<Buffer> {
        const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
        if (!existsSync(abs)) throw new Error('file not found');
        const buf = readFileSync(abs);
        return this.isWebP(buf) ? sharp(buf).toFormat('png').toBuffer() : buf;
    }

    private async resolveUserPhoto(imageFilename?: string): Promise<Buffer> {
        if (!imageFilename) return this.createSolidPlaceholder();

        const filePath = path.join(process.cwd(), 'uploads', 'pictures', imageFilename);
        try {
            return await this.safeLoadLocalFile(filePath);
        } catch {
            return this.createSolidPlaceholder();
        }
    }

    private async fetchAccessAsset(accessId: string, side: 'front' | 'back', accesses: AccessImageFiles): Promise<Buffer> {
        const ai = accesses[accessId];

        const filename = side === 'front' ? ai.frontPictureFilename : ai.backPictureFilename;
        if (!filename) return this.defaultBlank();

        const filePath = path.join(process.cwd(), 'uploads', 'badges', filename);
        try {
            return await this.safeLoadLocalFile(filePath);
        } catch {
            return this.defaultBlank();
        }
    }

    private async createSolidPlaceholder(): Promise<Buffer> {
        return sharp({
            create: {
                width: 300,
                height: 300,
                channels: 4,
                background: { r: 0, g: 45, b: 64, alpha: 1 },
            },
        }).png().toBuffer();
    }
    // ====== Fin helpers ======
}
