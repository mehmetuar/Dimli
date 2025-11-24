import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TeamsService } from './teams/teams.service';
import { UsersService } from './users/users.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const teamsService = app.get(TeamsService);
    const usersService = app.get(UsersService);

    const teamName = 'Fenerbahce'; // Case sensitive check might be needed depending on DB
    // Or we can find by partial name if needed, but let's try to find the team first.

    // Since findAll returns all teams, we can filter.
    const allTeams = await teamsService.findAll();
    const team = allTeams.find(t => t.name.toLowerCase().includes('fenerbahce') || t.name.toLowerCase().includes('fenerbahçe'));

    if (!team) {
        console.error(`Team '${teamName}' not found! Please create the team first.`);
        await app.close();
        return;
    }

    console.log(`Found team: ${team.name} (ID: ${team.id})`);

    const playersToAdd = [
        'alex10', 'hagi10', 'sergen', 'muslera', 'arda', 'icardi', 'dzeko', 'kerem', 'ferdi', 'baris'
    ];


    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const username of playersToAdd) {
        try {
            const user = await usersService.findOne(username);
            if (!user) {
                console.warn(`❌ User ${username} not found, skipping.`);
                skipCount++;
                continue;
            }

            // Check if already in team
            if (user.team) {
                console.log(`⚠️  User ${username} is already in a team: ${user.team.id ? 'Team ID: ' + user.team.id : 'Unknown team'}`);
                skipCount++;
                continue;
            }

            await teamsService.addPlayer(team.id, user.id);
            console.log(`✅ Added ${username} to ${team.name}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to add ${username}:`, error.message);
            console.error('Full error:', error);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`✅ Successfully added: ${successCount}`);
    console.log(`⚠️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');

    await app.close();
}

bootstrap();
