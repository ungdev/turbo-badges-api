import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiCookieAuth } from '@nestjs/swagger';
import { Response } from 'express';

import { AuthService } from 'src/auth/auth.service';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RefreshTokenService } from 'src/auth/refresh-token.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
        private refreshService: RefreshTokenService,
    ) { }

    private getCookieOptions(maxAgeMs: number) {
        const apiPrefix = this.configService.get<string>('API_PREFIX') || '';
        const cookiePath = apiPrefix ? `${apiPrefix}/auth` : '/auth';

        return {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'lax' as const,
            path: cookiePath,
            maxAge: maxAgeMs,
        };
    }

    @Post('local/login')
    @HttpCode(200)
    @ApiOperation({ summary: 'Local email/password authentication' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({
        status: 200,
        description: 'Login successful, returns access token and sets refresh token cookie',
        schema: {
            example: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async localLogin(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { email, password } = loginDto;

        const user = await this.authService.validateLocalUser(email, password);
        if (!user) {
            throw new UnauthorizedException('Identifiants invalides');
        }

        const { token, exp } = await this.refreshService.issue(user.id, user.role);
        const { access_token } = await this.authService.login(user);
        const maxAgeMs = (exp - Math.floor(Date.now() / 1000)) * 1000;

        res.cookie('rt', token, this.getCookieOptions(maxAgeMs));

        return { access_token };
    }

    @Get('oauth')
    @UseGuards(AuthGuard('authentik'))
    @ApiOperation({ summary: 'Initiate OAuth authentication with Authentik' })
    @ApiResponse({ status: 302, description: 'Redirects to Authentik login page' })
    oauthAuth() {
        // La redirection est gérée par Passport
    }

    @Get('oauth/signup')
    @ApiOperation({ summary: 'Redirect to Authentik signup page' })
    @ApiResponse({ status: 302, description: 'Redirects to Authentik signup page' })
    oauthSignup(@Res() res: Response) {
        const signupUrl = this.configService.get<string>('AUTHENTIK_SIGNUP_URL');
        res.redirect(signupUrl ?? "/");
    }

    @Get('oauth/callback')
    @UseGuards(AuthGuard('authentik'))
    @ApiOperation({ summary: 'OAuth callback endpoint (handled by Passport)' })
    @ApiResponse({ status: 302, description: 'Redirects to frontend with authentication cookie' })
    async oauthAuthCallback(@Req() req: any, @Res() res: Response) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const { token, exp } = await this.refreshService.issue(req.user.id, req.user.role);
        const maxAgeMs = (exp - Math.floor(Date.now() / 1000)) * 1000;
        res.cookie('rt', token, this.getCookieOptions(maxAgeMs));
        res.redirect(`${frontendUrl}/auth/callback`);
    }

    @Post('refresh')
    @HttpCode(200)
    @ApiCookieAuth('rt')
    @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        schema: {
            example: {
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
    async refresh(
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        const rt = req.cookies?.rt;
        if (!rt) {
            throw new UnauthorizedException('No refresh token');
        }
        const rotated = await this.refreshService.rotate(rt);
        if (!rotated) {
            throw new UnauthorizedException('Invalid refresh token');
        }
        const { userId, role, token: newRt, exp } = rotated;
        const { access_token } = await this.authService.login({ id: userId, role });
        const maxAgeMs = (exp - Math.floor(Date.now() / 1000)) * 1000;
        res.cookie('rt', newRt, this.getCookieOptions(maxAgeMs));
        return { access_token };
    }

    @Post('logout')
    @HttpCode(200)
    @ApiCookieAuth('rt')
    @ApiOperation({ summary: 'Logout and invalidate refresh token' })
    @ApiResponse({
        status: 200,
        description: 'Logged out successfully',
        schema: {
            example: {
                message: 'Logged out successfully'
            }
        }
    })
    async logout(
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        const rt = req.cookies?.rt;
        if (rt) await this.refreshService.revoke(rt);
        const apiPrefix = this.configService.get<string>('API_PREFIX') || '';
        const cookiePath = apiPrefix ? `${apiPrefix}/auth` : '/auth';
        res.clearCookie('rt', { path: cookiePath });
        return { message: 'Logged out successfully' };
    }
}
