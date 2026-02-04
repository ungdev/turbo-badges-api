import { Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';
import { FileUploadService } from 'src/file-upload/file-upload.service';
import { Role, UserProfile, UserProfileUpdateData, UserProfileUpdateDataInputs, UserProfileWithPassword } from 'src/users/user.model';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private fileUploadService: FileUploadService
    ) { }

    async getRoleFromGroups(groups?: string[]): Promise<Role> {
        const roles = await this.prisma.role.findMany({
            where: { oauthGroupName: { in: groups ?? [] } }
        });
        if (!roles || roles.length === 0) {
            const role = await this.prisma.role.findUnique({ where: { name: 'user' } });
            if (role) {
                return { id: role.id, name: role.name };
            } else {
                throw new Error('Default role "user" not found in database.');
            }
        }
        const role = roles.reduce((max, role) =>
            role.weight > max.weight ? role : max
        );
        return { id: role.id, name: role.name };
    }

    async createOrUpdateUser(
        id: string,
        { email, firstName, lastName, role }: UserProfileUpdateDataInputs,
    ): Promise<UserProfile> {

        const updateData: UserProfileUpdateData = {
            id,
            ...(email && { email }),
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
        };

        const user = await this.prisma.user.upsert({
            where: { id },
            update: updateData,
            create: {
                id,
                email: email ?? '',
                firstName: firstName ?? '',
                lastName: lastName ?? '',
                roleId: role.id,
            },
            include: {
                role: true
            },
        });

        return this.mapUserToUserProfile(user);
    }

    async getUserById(id: string): Promise<UserProfile | undefined> {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });
        return user ? this.mapUserToUserProfile(user) : undefined;
    }

    async getUserByEmail(email: string): Promise<UserProfile | undefined> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { role: true }
        });
        return user ? this.mapUserToUserProfile(user) : undefined;
    }

    async getUserWithPasswordByEmail(email: string): Promise<UserProfileWithPassword | undefined> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { role: true },
        });
        return user && user.password ? {
            ...this.mapUserToUserProfile(user),
            password: user.password,
        } : undefined;
    }

    async getAllUsers(): Promise<UserProfile[]> {
        const users = await this.prisma.user.findMany({
            include: { role: true },
        });
        return users.map(user => this.mapUserToUserProfile(user));
    }

    async updateUserProfilePicture(userId: string, filename: string): Promise<UserProfile> {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                pictureFilename: filename,
            },
            include: { role: true },
        });
        return this.mapUserToUserProfile(user);
    }

    async deleteUserProfilePicture(id: string): Promise<UserProfile | undefined> {
        const userProfilePictureFilename = await this.prisma.user.findUnique({
            where: { id },
            select: { pictureFilename: true },
        });

        if (!userProfilePictureFilename || !userProfilePictureFilename.pictureFilename) {
            return undefined;
        }

        await this.fileUploadService.deleteFile(userProfilePictureFilename.pictureFilename);

        const user = await this.prisma.user.update({
            where: { id },
            data: {
                pictureFilename: null,
            },
            include: { role: true },
        });

        return this.mapUserToUserProfile(user);
    }

    private mapUserToUserProfile(user: any): UserProfile {

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            ...(user.pictureFilename && { pictureFilename: user.pictureFilename }),
            role: {
                id: user.role.id,
                name: user.role.name
            },
        };
    }
}
