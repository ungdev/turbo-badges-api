import { Controller, Get, Post, Put, Req, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { UsersService } from '../users/users.service';
import { FileUploadService } from '../file-upload/file-upload.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
        private refreshService: RefreshTokenService,
        private usersService: UsersService,
        private fileUploadService: FileUploadService,
    ) { }

    @Post('local/login')
    async localLogin(@Body() body: { email: string; password: string }, @Res() res: Response) {
        const { email, password } = body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email et mot de passe requis' });
        }

        const user = await this.authService.validateLocalUser(email, password);
        if (!user) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }

        const { token, exp } = await this.refreshService.issue(user.id, user.role);
        const { access_token } = await this.authService.login(user);
        const maxAgeMs = (exp - Math.floor(Date.now() / 1000)) * 1000;

        res.cookie('rt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'lax',
            path: '/auth',
            maxAge: maxAgeMs,
        });

        return res.json({ access_token });
    }

    @Get('oauth')
    @UseGuards(AuthGuard('authentik'))
    async oauthAuth(@Req() req, @Res() res: Response) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        res.redirect(`${frontendUrl}/`);
    }

    @Get('oauth/signup')
    async oauthSignup(@Req() req, @Res() res: Response) {
        const signupUrl = this.configService.get<string>('AUTHENTIK_SIGNUP_URL');
        res.redirect(`${signupUrl}`);
    }

    @Get('oauth/callback')
    @UseGuards(AuthGuard('authentik'))
    async oauthAuthCallback(@Req() req, @Res() res: Response) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const { token, exp } = await this.refreshService.issue(req.user.id, req.user.role);
        const maxAgeMs = (exp - Math.floor(Date.now() / 1000)) * 1000;
        res.cookie('rt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'lax',
            path: '/auth',
            maxAge: maxAgeMs,
        });
        res.redirect(`${frontendUrl}/auth/callback`);
    }

    @Get('profile')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Req() req) {
        return await this.usersService.getUserById(req.user.id);
    }

    @Put('profile/photo')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('photo', {
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                cb(new BadRequestException('Only image files are allowed'), false);
            } else {
                cb(null, true);
            }
        },
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }))
    async uploadProfilePhoto(@Req() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const userId = req.user.id;
        const { filename, url } = this.fileUploadService.saveFile(file, userId);
        const updatedUser = await this.usersService.updateUserPhoto(userId, filename);

        return {
            user: updatedUser,
        };
    }

    @Put('profile')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(@Req() req, @Body() body: any, @Res() res: Response) {
        try {

            const userId = req.user.id;
            const updateData: JWTPayloadWithProfileUpdateBody = req.user;

            if (body.firstName) {
                updateData.firstName = body.firstName;
            }
            if (body.lastName) {
                updateData.lastName = body.lastName;
            }

            const updatedUserProfile = await this.usersService.createOrUpdateUser(userId, updateData);

            return res.json({ user: updatedUserProfile });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }

    @Post('refresh')
    async refresh(@Req() req, @Res() res: Response) {
        const rt = req.cookies?.rt;
        if (!rt) {
            return res.status(401).json({ message: 'No refresh token' });
        }
        const rotated = await this.refreshService.rotate(rt);
        if (!rotated) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
        const { userId, role, token: newRt, exp } = rotated;
        const { access_token } = await this.authService.login({ id: userId, role });
        const maxAgeMs = (exp - Math.floor(Date.now() / 1000)) * 1000;
        res.cookie('rt', newRt, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'lax',
            path: '/auth',
            maxAge: maxAgeMs,
        });
        return res.json({ access_token });
    }

    @Post('logout')
    async logout(@Req() req, @Res() res: Response) {
        const rt = req.cookies?.rt;
        if (rt) await this.refreshService.revoke(rt);
        res.clearCookie('rt', { path: '/auth' });
        return res.json({ message: 'Logged out successfully' });
    }
}
