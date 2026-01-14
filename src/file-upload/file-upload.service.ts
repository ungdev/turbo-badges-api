import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
    private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'photos');

    constructor() {
        this.ensureUploadsDir();
    }

    private ensureUploadsDir(): void {
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    saveFile(file: Express.Multer.File, userId: string): { filename: string; url: string } {
        if (!file) {
            throw new Error('No file provided');
        }

        const ext = path.extname(file.originalname);
        const filename = `${userId}-${uuidv4()}${ext}`;
        const filepath = path.join(this.uploadsDir, filename);

        fs.writeFileSync(filepath, file.buffer);

        return {
            filename,
            url: `/uploads/photos/${filename}`,
        };
    }

    deleteFile(filename: string): boolean {
        if (!filename) return false;

        const filepath = path.join(this.uploadsDir, filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            return true;
        }
        return false;
    }

    getFilePath(filename: string): string {
        return path.join(this.uploadsDir, filename);
    }
}
