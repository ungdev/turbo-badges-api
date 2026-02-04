import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
    private readonly uploadsBase = path.join(process.cwd(), 'uploads');

    constructor() {
        if (!fs.existsSync(this.uploadsBase)) {
            fs.mkdirSync(this.uploadsBase, { recursive: true });
        }
    }

    private getUploadsDir(subfolder: string): string {
        return path.join(this.uploadsBase, subfolder);
    }

    private ensureDir(subfolder: string): void {
        const dir = this.getUploadsDir(subfolder);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    saveToFolder(subfolder: string, file: Express.Multer.File, ownerId?: string): { filename: string; url: string } {
        if (!file) {
            throw new Error('No file provided');
        }

        const ext = path.extname(file.originalname);
        const filename = `${ownerId ?? 'file'}-${uuidv4()}${ext}`;

        this.ensureDir(subfolder);
        const dir = this.getUploadsDir(subfolder);
        const filepath = path.join(dir, filename);
        fs.writeFileSync(filepath, file.buffer);

        return {
            filename,
            url: `/uploads/${subfolder}/${filename}`,
        };
    }

    saveBadgePicture(file: Express.Multer.File, userId: string): { filename: string; url: string } {
        return this.saveToFolder('badges', file, userId);
    }

    saveUserPicture(file: Express.Multer.File, userId: string): { filename: string; url: string } {
        return this.saveToFolder('pictures', file, userId);
    }

    deleteFile(filename: string, subfolder = 'pictures'): boolean {
        if (!filename) return false;

        const filepath = path.join(this.getUploadsDir(subfolder), filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            return true;
        }
        return false;
    }

    getFilePath(filename: string, subfolder = 'pictures'): string {
        return path.join(this.getUploadsDir(subfolder), filename);
    }
}
