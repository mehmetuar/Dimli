import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

enum Position {
    GK = 'Kaleci',
    DEF = 'Defans',
    MID = 'Orta Saha',
    FWD = 'Forvet'
}

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    const fakeUsers = [
        { username: 'alex10', email: 'alex@sahapro.com', full_name: 'Alex De Souza', position: Position.MID, location: 'Kadıköy' },
        { username: 'hagi10', email: 'hagi@sahapro.com', full_name: 'Gheorghe Hagi', position: Position.MID, location: 'Florya' },
        { username: 'sergen', email: 'sergen@sahapro.com', full_name: 'Sergen Yalçın', position: Position.MID, location: 'Beşiktaş' },
        { username: 'muslera', email: 'muslera@sahapro.com', full_name: 'Fernando Muslera', position: Position.GK, location: 'Florya' },
        { username: 'arda', email: 'arda@sahapro.com', full_name: 'Arda Güler', position: Position.MID, location: 'Madrid' },
        { username: 'icardi', email: 'icardi@sahapro.com', full_name: 'Mauro Icardi', position: Position.FWD, location: 'İstanbul' },
        { username: 'dzeko', email: 'dzeko@sahapro.com', full_name: 'Edin Dzeko', position: Position.FWD, location: 'Kadıköy' },
        { username: 'kerem', email: 'kerem@sahapro.com', full_name: 'Kerem Aktürkoğlu', position: Position.FWD, location: 'İstanbul' },
        { username: 'ferdi', email: 'ferdi@sahapro.com', full_name: 'Ferdi Kadıoğlu', position: Position.DEF, location: 'Kadıköy' },
        { username: 'baris', email: 'baris@sahapro.com', full_name: 'Barış Alper Yılmaz', position: Position.FWD, location: 'Rize' },
    ];

    for (const user of fakeUsers) {
        try {
            const exists = await usersService.findOne(user.username);
            if (!exists) {
                await usersService.create({
                    ...user,
                    password: 'password123', // Default password
                });
                console.log(`Created user: ${user.username}`);
            } else {
                console.log(`User already exists: ${user.username}`);
            }
        } catch (error) {
            console.error(`Failed to create ${user.username}`, error);
        }
    }

    await app.close();
}

bootstrap();
