import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { UserProfile, UserProfileWithPotentiallyOAuthGroups } from 'src/users/user.model';

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

    async login(user: UserProfile) {
        return {
            access_token: this.jwtService.sign(user),
            user: user,
        };
    }
}
