import { Module } from '@nestjs/common';

import { PrismaModule } from 'prisma/prisma.module';
import { BadgesController } from 'src/badges/badges.controller';
import { BadgesService } from 'src/badges/badges.service';
import { FileUploadModule } from 'src/file-upload/file-upload.module';

@Module({
    imports: [
        PrismaModule,
        FileUploadModule
    ],
    controllers: [BadgesController],
    providers: [BadgesService],
    exports: [BadgesService],
})
export class BadgesModule { }
