import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BadgeRequestItemDto {
    @ApiProperty({
        description: 'User ID',
        example: 'clx123abc',
    })
    @IsNotEmpty({ message: 'userId est requis' })
    @IsString({ message: 'userId doit être une chaîne de caractères' })
    userId: string;

    @ApiProperty({
        description: 'Grade ID',
        example: 'clx456def',
    })
    @IsNotEmpty({ message: 'gradeId est requis' })
    @IsString({ message: 'gradeId doit être une chaîne de caractères' })
    gradeId: string;

    @ApiProperty({
        description: 'Commission ID',
        example: 'clx789ghi',
    })
    @IsNotEmpty({ message: 'commissionId est requis' })
    @IsString({ message: 'commissionId doit être une chaîne de caractères' })
    commissionId: string;

    @ApiProperty({
        description: 'Access ID',
        example: 'clx012jkl',
    })
    @IsNotEmpty({ message: 'accessId est requis' })
    @IsString({ message: 'accessId doit être une chaîne de caractères' })
    accessId: string;
}
