import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class TeamsService {
    constructor(
        @InjectRepository(Team)
        private teamsRepository: Repository<Team>,
        private usersService: UsersService,
    ) { }

    async create(createTeamDto: any, user: User): Promise<Team> {
        // Prevent frontend mock captainId from overriding
        delete createTeamDto.captainId;

        // Fetch the managed user entity to ensure TypeORM tracks it for the relationship
        const managedUser = await this.usersService.findById(user.id);
        if (!managedUser) throw new Error('User not found');

        // Preempt the TypeORM duplicate key unique constraint on OneToOne
        const existingLedTeam = await this.teamsRepository.findOne({ where: { captainId: managedUser.id } });
        if (existingLedTeam) {
            throw new Error('Zaten bir takımın kaptanısınız. Yeni takım kurmak için mevcut takımı devretmeli veya silmelisiniz.');
        }

        const team = this.teamsRepository.create({
            ...createTeamDto,
            captain: managedUser,
            captainId: managedUser.id,
            players: [managedUser] // This is safe now because managedUser is tracked
        } as unknown as Team);

        const savedTeam = await this.teamsRepository.save(team);

        // Update the user explicitly to point to the newly created team
        managedUser.team = savedTeam;
        await this.usersService['usersRepository'].save(managedUser);

        // Return the full team with relations
        return this.findOne(savedTeam.id) as Promise<Team>;
    }

    async findAll(): Promise<Team[]> {
        const teams = await this.teamsRepository.find({ relations: ['captain'] });

        // For each team, manually load players using query builder
        for (const team of teams) {
            team.players = await this.usersService['usersRepository']
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.team', 'team')
                .where('team.id = :teamId', { teamId: team.id })
                .getMany();
        }

        return teams;
    }

    async searchByName(name: string): Promise<Team | null> {
        const team = await this.teamsRepository
            .createQueryBuilder('team')
            .leftJoinAndSelect('team.captain', 'captain')
            .where('LOWER(team.name) = LOWER(:name)', { name })
            .getOne();

        if (!team) return null;

        // Load players
        team.players = await this.usersService['usersRepository']
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.team', 'userTeam')
            .where('userTeam.id = :teamId', { teamId: team.id })
            .getMany();

        return team;
    }

    async findOne(id: string): Promise<Team | null> {
        const team = await this.teamsRepository.findOne({
            where: { id },
            relations: ['captain', 'players']
        });

        if (!team) return null;

        // Manually load players using query builder to find all users with this team
        const players = await this.usersService['usersRepository']
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.team', 'team')
            .where('team.id = :teamId', { teamId: team.id })
            .getMany();

        console.log(`🔍 DEBUG: Found ${players.length} players for team ${team.name}`);

        // Map User entity to Player interface structure
        team.players = players.map(user => ({
            ...user,
            id: user.id,
            name: user.full_name || user.username, // vital mapping
            position: user.position,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random`,
            rating: user.rating,
            teamId: team.id
        }));

        return team;
    }

    async addPlayer(teamId: string, userId: string): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        const user = await this.usersService.findById(userId);
        if (!user) throw new Error('User not found');

        // Check if user is already in a team
        if (user.team) throw new Error('User is already in a team');

        // Check max roster size
        if (team.players && team.players.length >= 28) {
            throw new Error('Kadro maksimum 28 kişi olabilir.');
        }

        // Set the team on the user (this is the ManyToOne side, which owns the foreign key)
        user.team = team;

        // We need to save the user to persist the team relationship
        // Since usersService doesn't have an update method, we'll use the repository
        await this.usersService['usersRepository'].save(user);

        // Reload the team to get the updated players list
        const updatedTeam = await this.findOne(teamId);
        if (!updatedTeam) throw new Error('Team not found after update');

        return updatedTeam;
    }

    async removePlayer(teamId: string, playerId: string): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        // Cannot remove captain
        if (team.captain.id === playerId) {
            throw new Error('Cannot remove captain from the team');
        }

        team.players = team.players.filter(p => p.id !== playerId);

        // If vice captain is removed, remove from viceCaptainIds
        if (team.viceCaptainIds?.includes(playerId)) {
            team.viceCaptainIds = team.viceCaptainIds.filter(id => id !== playerId);
        }

        return this.teamsRepository.save(team);
    }

    async updatePlayerRole(teamId: string, playerId: string, role: 'CAPTAIN' | 'VICE'): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        const player = team.players.find(p => p.id === playerId);
        if (!player) throw new Error('Player not found in team');

        if (role === 'CAPTAIN') {
            // Swap captain
            team.captain = player;
        } else if (role === 'VICE') {
            // Add to viceCaptainIds if not already present (max 2)
            if (!team.viceCaptainIds) team.viceCaptainIds = [];
            if (!team.viceCaptainIds.includes(playerId) && team.viceCaptainIds.length < 2) {
                team.viceCaptainIds.push(playerId);
            }
        }

        return this.teamsRepository.save(team);
    }

    async updateViceCaptains(teamId: string, add?: string, remove?: string): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        if (!team.viceCaptainIds) team.viceCaptainIds = [];

        if (add) {
            // Add vice-captain (max 2)
            if (!team.viceCaptainIds.includes(add) && team.viceCaptainIds.length < 2) {
                team.viceCaptainIds.push(add);
            }
        }

        if (remove) {
            // Remove vice-captain
            team.viceCaptainIds = team.viceCaptainIds.filter(id => id !== remove);
        }

        return this.teamsRepository.save(team);
    }

    async updateHomePitch(teamId: string, homePitchId: string): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        team.homePitchId = homePitchId;
        // If switching back to pitch, maybe clear business? Or keep both as preference?
        // Let's keep distinct for now.
        return this.teamsRepository.save(team);
    }

    async updateHomeBusiness(teamId: string, homeBusinessId: string): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        team.homeBusinessId = homeBusinessId;
        return this.teamsRepository.save(team);
    }

    async updateDescription(teamId: string, description: string): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        team.description = description;
        return this.teamsRepository.save(team);
    }

    async updateTeam(teamId: string, dto: { name?: string; level?: string; location?: string; logoUrl?: string; primaryColor?: string; secondaryColor?: string }): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        if (dto.name !== undefined) team.name = dto.name;
        if (dto.level !== undefined) team.level = dto.level;
        if (dto.location !== undefined) team.location = dto.location;
        if (dto.logoUrl !== undefined) team.logoUrl = dto.logoUrl;
        if (dto.primaryColor !== undefined) team.primaryColor = dto.primaryColor;
        if (dto.secondaryColor !== undefined) team.secondaryColor = dto.secondaryColor;

        return this.teamsRepository.save(team);
    }

    async leaveTeam(teamId: string, userId: string): Promise<void> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        const isCaptain = team.captain && team.captain.id === userId;

        // If the captain is leaving and they are the only player, delete the team entirely
        if (isCaptain && team.players && team.players.length === 1) {
            await this.deleteTeam(teamId, userId);
            return;
        }

        if (isCaptain) {
            throw new Error('Kaptan takımdan ayrılamaz. Önce kaptanlığı devredin.');
        }

        const user = await this.usersService.findById(userId);
        if (!user) throw new Error('User not found');

        // Remove from vice captains if applicable
        if (team.viceCaptainIds?.includes(userId)) {
            team.viceCaptainIds = team.viceCaptainIds.filter(id => id !== userId);
            await this.teamsRepository.save(team);
        }

        // Remove teamId from user
        user.team = null as any;
        await this.usersService['usersRepository'].save(user);
    }

    async deleteTeam(teamId: string, userId: string): Promise<void> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        const isCaptain = (team.captain && team.captain.id === userId) || team.captainId === userId;
        if (!isCaptain) throw new Error('Sadece kaptan takımı silebilir.');

        if (team.players && team.players.length > 0) {
            for (const player of team.players) {
                player.team = null as any;
                await this.usersService['usersRepository'].save(player);
            }
        }

        await this.teamsRepository.delete(teamId);
    }
}
