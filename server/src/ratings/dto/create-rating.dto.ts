import { IsString, IsIn, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateRatingDto {
    @IsString()
    reservationId: string;

    @IsIn(['BUSINESS', 'FAIRPLAY'])
    type: 'BUSINESS' | 'FAIRPLAY';

    @IsOptional()
    @IsString()
    targetBusinessId?: string;

    @IsOptional()
    @IsString()
    targetTeamId?: string;

    @IsNumber()
    @Min(1)
    @Max(5)
    score: number;
}
