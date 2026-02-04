import { Module } from '@nestjs/common';

import { PrismaModule } from 'prisma/prisma.module';
import { FileUploadModule } from 'src/file-upload/file-upload.module';
import { UsersController } from 'src/users/user.controller';
import { UsersService } from 'src/users/users.service';

@Module({
    imports: [
        PrismaModule,
        FileUploadModule
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
