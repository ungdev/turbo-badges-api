import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { RefreshTokenService } from 'src/auth/refresh-token.service';
import { AuthentikStrategy } from 'src/auth/strategies/authentik.strategy';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { FileUploadModule } from 'src/file-upload/file-upload.module';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const secret = configService.getOrThrow<string>('JWT_SECRET');
                const expiresIn = configService.get<string>('JWT_EXPIRES') ?? '15m';

                const expiresInValue = /^\d+$/.test(expiresIn) ? parseInt(expiresIn, 10) : expiresIn;

                return {
                    secret,
                    signOptions: { expiresIn: expiresInValue as any },
                };
            },
        }),
        UsersModule,
        FileUploadModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, AuthentikStrategy, JwtStrategy, RefreshTokenService],
    exports: [AuthService, JwtModule, UsersModule],
})
export class AuthModule { }
