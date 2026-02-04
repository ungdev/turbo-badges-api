import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const imageFileFilter = (_req: any, file: Express.Multer.File, callback: any) => {
    if (!file.mimetype.startsWith('image/')) {
        callback(new BadRequestException('Only image files are allowed'), false);
    } else {
        callback(null, true);
    }
};

export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};
