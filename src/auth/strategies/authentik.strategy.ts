import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class AuthentikStrategy extends PassportStrategy(Strategy, 'authentik') {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            authorizationURL: configService.get<string>('AUTHENTIK_AUTHORIZATION_URL')!,
            tokenURL: configService.get<string>('AUTHENTIK_TOKEN_URL')!,
            clientID: configService.get<string>('AUTHENTIK_CLIENT_ID')!,
            clientSecret: configService.get<string>('AUTHENTIK_CLIENT_SECRET')!,
            callbackURL: configService.get<string>('AUTHENTIK_CALLBACK_URL')!,
            scope: ['openid', 'profile', 'email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: any,
    ): Promise<any> {
        try {
            const userInfoUrl = this.configService.get<string>('AUTHENTIK_USERINFO_URL');
            if (!userInfoUrl) {
                return done(new Error('AUTHENTIK_USERINFO_URL is not configured'), null);
            }

            const response = await fetch(userInfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                return done(new Error('Failed to fetch user info'), null);
            }

            const userInfo = await response.json();

            const userNames = userInfo.given_name ? userInfo.given_name.split(' ') : [];

            const user = await this.authService.validateOAuthUser({
                id: userInfo.sub,
                email: userInfo.email,
                firstName: userNames[0] || '',
                lastName: userNames.slice(1).join(' ') || '',
                groups: userInfo.groups || [],
                role: undefined,
            });
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }
}
