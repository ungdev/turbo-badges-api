import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        configService: ConfigService,
    ) {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });

        this.logger.debug(`JWT Strategy initialized (secret length: ${secret.length})`);
    }

    async validate(payload: JwtPayload) {
        this.logger.debug(`Validating JWT payload for user: ${payload.id}`);
        return {
            id: payload.id,
            role: payload.role,
        };
    }
}
