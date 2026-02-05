import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NewOptionDto {
    @ApiProperty({
        description: 'Option name',
        example: 'Bureau',
    })
    @IsNotEmpty({ message: 'Le nom de l\'option est requis' })
    @IsString({ message: 'Le nom doit être une chaîne de caractères' })
    @MinLength(1, { message: 'Le nom ne peut pas être vide' })
    name!: string;
}
