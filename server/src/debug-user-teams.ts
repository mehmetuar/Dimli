import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    // Get all users with team relation via the service's repository
    const users = await usersService['usersRepository'].find({
        relations: ['team'],
        take: 20
    });

    console.log('\n📊 Users and their teams:\n');
    for (const user of users) {
        const teamInfo = user.team ? `Team ID: ${user.team.id}` : 'NO TEAM';
        console.log(`${user.username.padEnd(15)} (${user.full_name.padEnd(20)}): ${teamInfo}`);
    }
    console.log(`\nTotal users: ${users.length}\n`);

    await app.close();
}

bootstrap();
