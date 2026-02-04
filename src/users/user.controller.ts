import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';

import { AdminGuard } from 'src/auth/guards/admin.guard';
import { IMAGE_UPLOAD_OPTIONS } from 'src/file-upload/file-upload.config';
import { FileUploadService } from 'src/file-upload/file-upload.service';
import { UpdateProfileDto } from 'src/users/dto/update-profile.dto';
import { UsersService } from 'src/users/users.service';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private fileUploadService: FileUploadService
    ) { }

    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @Get()
    async getAllUsers() {
        const users = await this.usersService.getAllUsers();
        return users;
    }

    @Get('me/profile')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Req() req: any) {
        return await this.usersService.getUserById(req.user.id);
    }

    @Put('me/profile')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    async updateProfile(@Req() req: any, @Body() updateProfileDto: UpdateProfileDto) {
        const userId = req.user.id;
        const updateData: JWTPayloadWithProfileUpdateBody = {
            ...req.user,
            ...updateProfileDto,
        };

        const updatedUserProfile = await this.usersService.createOrUpdateUser(userId, updateData);

        return { user: updatedUserProfile };
    }

    @Put(':id/profile')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @HttpCode(200)
    async updateProfileForUser(@Req() req: any, @Body() updateProfileDto: UpdateProfileDto & { role?: any }) {
        const userId = req.params.id;
        const updateData: JWTPayloadWithProfileUpdateBody = {
            id: userId,
            role: updateProfileDto.role,
            ...updateProfileDto,
        };

        const updatedUserProfile = await this.usersService.createOrUpdateUser(userId, updateData);

        return { user: updatedUserProfile };
    }

    @Put('me/picture')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('picture', IMAGE_UPLOAD_OPTIONS))
    async uploadProfilePicture(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const userId = req.user.id;
        const savedFile = this.fileUploadService.saveUserPicture(file, userId);

        await this.usersService.deleteUserProfilePicture(userId);

        const updatedUser = await this.usersService.updateUserProfilePicture(userId, savedFile.filename);

        return { user: updatedUser };
    }

    @Put(':id/picture')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @UseInterceptors(FileInterceptor('picture', IMAGE_UPLOAD_OPTIONS))
    async uploadProfilePictureForUser(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const userId = req.params.id;
        const savedFile = this.fileUploadService.saveUserPicture(file, userId);

        await this.usersService.deleteUserProfilePicture(userId);

        const updatedUser = await this.usersService.updateUserProfilePicture(userId, savedFile.filename);

        return { user: updatedUser };
    }

    @Delete('me/picture')
    @UseGuards(AuthGuard('jwt'))
    async deleteProfilePicture(@Req() req: any) {

        const userId = req.user.id;

        const updatedUser = await this.usersService.deleteUserProfilePicture(userId);

        return { user: updatedUser };
    }

    @Delete(':id/picture')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    async deleteProfilePictureForUser(@Req() req: any) {

        const userId = req.params.id;

        const updatedUser = await this.usersService.deleteUserProfilePicture(userId);

        return { user: updatedUser };
    }
}