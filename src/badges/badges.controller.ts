import { BadRequestException, Body, Controller, Delete, Get, ParseArrayPipe, Post, Put, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

import { AdminGuard } from 'src/auth/guards/admin.guard';
import { AgentGuard } from 'src/auth/guards/agent.guard';
import { BadgesService } from 'src/badges/badges.service';
import { BadgeRequestItemDto } from 'src/badges/dto/generate-badges.dto';
import { NewOptionDto } from 'src/badges/dto/new-option.dto';
import { IMAGE_UPLOAD_OPTIONS } from 'src/file-upload/file-upload.config';
import { FileUploadService } from 'src/file-upload/file-upload.service';

@Controller('badges')
export class BadgesController {
    constructor(
        private readonly badgesService: BadgesService,
        private readonly fileUploadService: FileUploadService,
    ) { }

    @Get('options')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    async getOptions(@Req() req: any) {
        return this.badgesService.getOptions(req.user.id);
    }

    @Post('options/:type')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    async postOption(@Req() req: any, @Body() newOptionDto: NewOptionDto) {
        if (!['commission', 'grade', 'access'].includes(req.params.type)) {
            throw new BadRequestException('Type d\'option invalide');
        }
        return this.badgesService.postOption(req.params.type, newOptionDto.name);
    }

    @Delete('options/:type/:id')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    async deleteOption(@Req() req: any) {
        if (!['commission', 'grade', 'access'].includes(req.params.type)) {
            throw new BadRequestException('Type d\'option invalide');
        }
        return this.badgesService.deleteOption(req.params.type, req.params.id);
    }

    @Put('options/access/:id/picture/:side')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    @UseInterceptors(FileInterceptor('picture', IMAGE_UPLOAD_OPTIONS))
    async uploadAccessImage(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const userId = req.user.id;
        const accessId = req.params.id;
        const side = req.params.side;

        await this.badgesService.deleteAccessImage(userId, accessId, side);

        const savedFile = this.fileUploadService.saveBadgePicture(file, userId);

        const updatedAccessImage = await this.badgesService.updateAccessImage(userId, accessId, savedFile.filename, side);

        return updatedAccessImage;
    }

    @Delete('options/access/:id/picture/:side')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    async deleteAccessImage(@Req() req: any) {

        const userId = req.user.id;

        const updatedAccessImage = await this.badgesService.deleteAccessImage(userId, req.params.id, req.params.side);

        return updatedAccessImage;
    }

    @Post('generate')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    async generateBadges(
        @Req() req: any,
        @Res() res: Response,
        @Body(new ParseArrayPipe({ items: BadgeRequestItemDto, whitelist: true })) requests: BadgeRequestItemDto[],
    ) {
        if (requests.length === 0) {
            throw new BadRequestException('Le tableau ne peut pas être vide');
        }

        const result = await this.badgesService.generateBadgesPdf(
            requests,
            req.user.id,
        );

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="badges.pdf"',
            'Content-Length': result.content.length,
        });

        res.send(result.content);
    }
}