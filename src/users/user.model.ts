export interface Role {
    id: string;
    name: string;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
}

export interface UserProfileWithPotentiallyOAuthGroups extends Omit<UserProfile, 'role'> {
    role?: Role;
    groups?: string[];
}

export interface User extends UserProfile {
    photoFilename?: string;
    createdAt: Date;
    updatedAt: Date;
}
