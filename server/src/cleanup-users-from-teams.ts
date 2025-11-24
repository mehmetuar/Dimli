import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    const testUsernames = [
        'alex10', 'hagi10', 'sergen', 'muslera', 'arda', 'icardi', 'dzeko', 'kerem', 'ferdi', 'baris'
    ];

    console.log('🧹 Cleaning up test users from teams...\n');

    for (const username of testUsernames) {
        try {
            const user = await usersService.findOne(username);
            if (!user) {
                console.log(`⚠️  User ${username} not found, skipping.`);
                continue;
            }

            if (user.team) {
                user.team = null;
                await usersService['usersRepository'].save(user);
                console.log(`✅ Removed ${username} from team`);
            } else {
                console.log(`ℹ️  User ${username} is not in any team`);
            }
        } catch (error) {
            console.error(`❌ Failed to clean ${username}:`, error.message);
        }
    }

    console.log('\n✅ Cleanup complete!\n');
    await app.close();
}

bootstrap();
