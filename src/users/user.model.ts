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

export interface UserProfileWithPassword extends UserProfile {
    password: string;
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

export interface UserProfileUpdateDataInputs {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role: Role;
}

export interface UserProfileUpdateData {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
}