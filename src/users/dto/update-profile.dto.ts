import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: 'User first name',
        example: 'John',
    })
    @IsOptional()
    @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
    @MinLength(1, { message: 'Le prénom ne peut pas être vide' })
    firstName?: string;

    @ApiPropertyOptional({
        description: 'User last name',
        example: 'Doe',
    })
    @IsOptional()
    @IsString({ message: 'Le nom doit être une chaîne de caractères' })
    @MinLength(1, { message: 'Le nom ne peut pas être vide' })
    lastName?: string;
}
