import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: 'Email invalide' })
    @IsNotEmpty({ message: 'Email requis' })
    email!: string;

    @ApiProperty({
        description: 'User password',
        example: 'password123',
        minLength: 1,
    })
    @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
    @IsNotEmpty({ message: 'Mot de passe requis' })
    @MinLength(1, { message: 'Mot de passe requis' })
    password!: string;
}
