interface OAuthProfile {
    id: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name: string;
    preferred_username: string;
    nickname: string;
    groups: string[];
}

interface JWTPayloadWithProfileUpdateBody extends JwtPayload {
    firstName?: string;
    lastName?: string;
}