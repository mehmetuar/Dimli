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
        const team = this.teamsRepository.create({
            ...createTeamDto,
            captain: user,
            players: [user]
        } as unknown as Team); // Force cast to avoid type issues with DeepPartial
        return this.teamsRepository.save(team);
    }

    async findAll(): Promise<Team[]> {
        const teams = await this.teamsRepository.find({ relations: ['captain', 'viceCaptain'] });

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

    async findOne(id: string): Promise<Team | null> {
        const team = await this.teamsRepository.findOne({
            where: { id },
            relations: ['captain', 'viceCaptain']
        });

        if (!team) return null;

        // Manually load players using query builder to find all users with this team
        const players = await this.usersService['usersRepository']
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.team', 'team')
            .where('team.id = :teamId', { teamId: team.id })
            .getMany();

        console.log(`🔍 DEBUG: Found ${players.length} players for team ${team.name}`);
        console.log('Player usernames:', players.map(p => p.username));

        team.players = players;

        return team;
    }

    async addPlayer(teamId: string, userId: string): Promise<Team> {
        const team = await this.findOne(teamId);
        if (!team) throw new Error('Team not found');

        const user = await this.usersService.findById(userId);
        if (!user) throw new Error('User not found');

        // Check if user is already in a team
        if (user.team) throw new Error('User is already in a team');

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

        // If vice captain is removed, unset vice captain
        if (team.viceCaptain?.id === playerId) {
            team.viceCaptain = null as any;
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
            const oldCaptain = team.captain;
            team.captain = player;
            // Old captain becomes regular player (already in players list)
        } else if (role === 'VICE') {
            team.viceCaptain = player;
        }

        return this.teamsRepository.save(team);
    }
}
