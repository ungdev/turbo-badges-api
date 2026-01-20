import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { UserProfile, UserProfileWithPotentiallyOAuthGroups, Role } from 'src/users/user.model';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private usersService: UsersService,
    ) { }

    async validateOAuthUser(profile: UserProfileWithPotentiallyOAuthGroups): Promise<UserProfile> {
        const user: UserProfile = {
            id: profile.id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            role: profile.role ? profile.role : await this.usersService.getRoleFromGroups(profile.groups),
        };

        const userProfile = await this.usersService.createOrUpdateUser(user.id, user);

        return userProfile;
    }

    async validateLocalUser(email: string, password: string): Promise<UserProfile | null> {
        const user = await this.usersService.getUserWithPasswordByEmail(email);
        if (!user || !user.password) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return null;
        }

        const userProfile: UserProfile = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: {
                id: user.role.id,
                name: user.role.name,
            },
        };

        return userProfile;
    }

    async login(user: { id: string; role: Role } | UserProfile) {
        const tokenPayload = {
            id: user.id,
            role: user.role,
        };

        return {
            access_token: this.jwtService.sign(tokenPayload),
        };
    }
}
