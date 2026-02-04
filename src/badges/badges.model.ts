export interface Option {
    id: string;
    name: string;
}

export interface BadgeOptions {
    commissions: Option[];
    grades: Option[];
    accesses: Array<Option & {
        frontPictureFilename?: string;
        backPictureFilename?: string;
    }>;
}

export interface AccessImageProfile {
    accessId: string;
    frontPictureFilename?: string;
    backPictureFilename?: string;
}

export type AccessImageFiles = Record<string, {
    frontPictureFilename: string | null;
    backPictureFilename: string | null;
}>;

export interface BadgeItem {
    userId: string;
    accessId: string;
    firstName: string;
    lastName: string;
    commissionName: string;
    imageFilename: string | null;
}