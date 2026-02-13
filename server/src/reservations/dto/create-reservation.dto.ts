export class CreateReservationDto {
    pitchId: string;
    teamId: string;
    slotTime: Date;
    type: 'DIRECT' | 'MATCH';
    opponentTeamId?: string; // Only for MATCH type
    matchAnnouncementId?: string; // Only for MATCH type
}
