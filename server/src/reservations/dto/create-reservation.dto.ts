import { IsNotEmpty, IsUUID, IsDateString, IsIn, ValidateIf } from 'class-validator';

export class CreateReservationDto {
    @IsNotEmpty()
    @IsUUID()
    pitchId: string;

    @IsNotEmpty()
    @IsUUID()
    teamId: string;

    @IsNotEmpty()
    @IsDateString()
    slotTime: Date;

    @IsNotEmpty()
    @IsIn(['DIRECT', 'MATCH'])
    type: 'DIRECT' | 'MATCH';

    @ValidateIf(o => o.type === 'MATCH')
    @IsNotEmpty()
    @IsUUID()
    opponentTeamId?: string;

    @ValidateIf(o => o.type === 'MATCH')
    @IsNotEmpty()
    @IsUUID()
    matchAnnouncementId?: string;
}
