import { BadRequestException, Body, Controller, Delete, Get, ParseArrayPipe, Post, Put, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';

import { AdminGuard } from 'src/auth/guards/admin.guard';
import { AgentGuard } from 'src/auth/guards/agent.guard';
import { BadgesService } from 'src/badges/badges.service';
import { BadgeRequestItemDto } from 'src/badges/dto/generate-badges.dto';
import { NewOptionDto } from 'src/badges/dto/new-option.dto';
import { IMAGE_UPLOAD_OPTIONS } from 'src/file-upload/file-upload.config';
import { FileUploadService } from 'src/file-upload/file-upload.service';

@ApiTags('Badges')
@ApiBearerAuth('access-token')
@Controller('badges')
export class BadgesController {
    constructor(
        private readonly badgesService: BadgesService,
        private readonly fileUploadService: FileUploadService,
    ) { }

    @Get('options')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    @ApiOperation({ summary: 'Get all badge options (commissions, grades, accesses)' })
    @ApiResponse({
        status: 200,
        description: 'Badge options retrieved successfully',
        schema: {
            example: {
                commissions: [{ id: 'uuid', name: 'Bureau' }],
                grades: [{ id: 'uuid', name: 'Responsable' }],
                accesses: [{ id: 'uuid', name: 'Accès Staff' }]
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Forbidden - Agent/Admin access required' })
    async getOptions(@Req() req: any) {
        return this.badgesService.getOptions(req.user.id);
    }

    @Post('options/:type')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    @ApiOperation({ summary: 'Create a new badge option (commission/grade/access)' })
    @ApiParam({ name: 'type', enum: ['commission', 'grade', 'access'], description: 'Type of option to create' })
    @ApiBody({ type: NewOptionDto })
    @ApiResponse({ status: 201, description: 'Option created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid option type' })
    @ApiResponse({ status: 403, description: 'Forbidden - Agent/Admin access required' })
    async postOption(@Req() req: any, @Body() newOptionDto: NewOptionDto) {
        if (!['commission', 'grade', 'access'].includes(req.params.type)) {
            throw new BadRequestException('Type d\'option invalide');
        }
        return this.badgesService.postOption(req.params.type, newOptionDto.name);
    }

    @Delete('options/:type/:id')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiOperation({ summary: 'Delete a badge option (Admin only)' })
    @ApiParam({ name: 'type', enum: ['commission', 'grade', 'access'], description: 'Type of option' })
    @ApiParam({ name: 'id', description: 'Option ID' })
    @ApiResponse({ status: 200, description: 'Option deleted successfully' })
    @ApiResponse({ status: 400, description: 'Invalid option type' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async deleteOption(@Req() req: any) {
        if (!['commission', 'grade', 'access'].includes(req.params.type)) {
            throw new BadRequestException('Type d\'option invalide');
        }
        return this.badgesService.deleteOption(req.params.type, req.params.id);
    }

    @Put('options/access/:id/picture/:side')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    @UseInterceptors(FileInterceptor('picture', IMAGE_UPLOAD_OPTIONS))
    @ApiOperation({ summary: 'Upload access badge image (front or back)' })
    @ApiParam({ name: 'id', description: 'Access ID' })
    @ApiParam({ name: 'side', enum: ['front', 'back'], description: 'Side of the badge' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                picture: {
                    type: 'string',
                    format: 'binary',
                    description: 'Badge image file (max 5MB)',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
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
    @ApiOperation({ summary: 'Delete access badge image' })
    @ApiParam({ name: 'id', description: 'Access ID' })
    @ApiParam({ name: 'side', enum: ['front', 'back'], description: 'Side of the badge' })
    @ApiResponse({ status: 200, description: 'Image deleted successfully' })
    @ApiResponse({ status: 404, description: 'Image not found' })
    async deleteAccessImage(@Req() req: any) {

        const userId = req.user.id;

        const updatedAccessImage = await this.badgesService.deleteAccessImage(userId, req.params.id, req.params.side);

        return updatedAccessImage;
    }

    @Post('generate')
    @UseGuards(AuthGuard('jwt'), AgentGuard)
    @ApiOperation({ summary: 'Generate badges PDF from list of requests' })
    @ApiBody({
        type: [BadgeRequestItemDto],
        description: 'Array of badge requests',
        examples: {
            example1: {
                summary: 'Badge generation request',
                value: [
                    {
                        userId: 'user-uuid-1',
                        gradeId: 'grade-uuid',
                        commissionId: 'commission-uuid',
                        accessId: 'access-uuid'
                    }
                ]
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'PDF generated successfully',
        content: {
            'application/pdf': {
                schema: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid request or empty array' })
    @ApiResponse({ status: 404, description: 'User, grade, commission or access not found' })
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