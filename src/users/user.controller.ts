import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @UseGuards(JwtAuthGuard)
    @Post('upload-photo')
    @UseInterceptors(FileInterceptor('photo'))
    async uploadPhoto(
        @UploadedFile() file: Express.Multer.File,
        @Req() req,
    ) {
        const userId = req.user.id;
        return this.usersService.updateUserPhoto(userId, file.filename);
    }
}