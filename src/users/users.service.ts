import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, User, UserProfile } from './user.model';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async getRoleFromGroups(groups?: string[]): Promise<Role> {
        const roles = await this.prisma.role.findMany({
            where: { oauthGroupName: { in: groups || [] } }
        });
        if (!roles || roles.length === 0) {
            const role = await this.prisma.role.findUnique({ where: { name: 'user' } });
            if (role) {
                return { id: role.id, name: role.name };
            } else {
                throw new Error('Default role "user" not found in database.');
            }
        }
        const role = roles.reduce((max, role) =>
            role.weight > max.weight ? role : max
        );
        return { id: role.id, name: role.name };
    }

    async createOrUpdateUser(id: string, data: UserProfile): Promise<UserProfile> {

        const user = await this.prisma.user.upsert({
            where: { id },
            update: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                roleId: data.role.id
            },
            create: {
                id,
                email: data.email || '',
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                roleId: data.role.id,
            },
            include: { role: true },
        });

        return this.mapUserToUserProfile(user);
    }

    async getUserById(id: string): Promise<UserProfile | undefined> {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        return user ? this.mapUserToUserProfile(user) : undefined;
    }

    async getUserByEmail(email: string): Promise<UserProfile | undefined> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { role: true },
        });
        return user ? this.mapUserToUserProfile(user) : undefined;
    }

    async updateUserPhoto(id: string, photoFilename: string): Promise<UserProfile | undefined> {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                photoFilename,
            },
            include: { role: true },
        });
        return this.mapUserToUserProfile(user);
    }

    async deleteUserPhoto(id: string): Promise<UserProfile | undefined> {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                photoFilename: null,
            },
            include: { role: true },
        });
        return this.mapUserToUserProfile(user);
    }

    private mapUserToUserProfile(user: any): UserProfile {

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: {
                id: user.role.id,
                name: user.role.name
            },
        };
    }
}
