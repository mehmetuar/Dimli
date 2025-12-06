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
        { username: 'alex10', email: 'alex@sahapro.com', full_name: 'Alex De Souza', position: Position.MID, location: 'Kadıköy', phone: '05551112233', birthDate: new Date('1977-09-14'), secondaryPosition: 'Forvet' },
        { username: 'hagi10', email: 'hagi@sahapro.com', full_name: 'Gheorghe Hagi', position: Position.MID, location: 'Florya', phone: '05552223344', birthDate: new Date('1965-02-05'), secondaryPosition: 'Forvet' },
        { username: 'sergen', email: 'sergen@sahapro.com', full_name: 'Sergen Yalçın', position: Position.MID, location: 'Beşiktaş', phone: '05553334455', birthDate: new Date('1972-10-05'), secondaryPosition: 'Forvet' },
        { username: 'muslera', email: 'muslera@sahapro.com', full_name: 'Fernando Muslera', position: Position.GK, location: 'Florya', phone: '05554445566', birthDate: new Date('1986-06-16'), secondaryPosition: '' },
        { username: 'arda', email: 'arda@sahapro.com', full_name: 'Arda Güler', position: Position.MID, location: 'Madrid', phone: '05555556677', birthDate: new Date('2005-02-25'), secondaryPosition: 'Forvet' },
        { username: 'icardi', email: 'icardi@sahapro.com', full_name: 'Mauro Icardi', position: Position.FWD, location: 'İstanbul', phone: '05556667788', birthDate: new Date('1993-02-19'), secondaryPosition: '' },
        { username: 'dzeko', email: 'dzeko@sahapro.com', full_name: 'Edin Dzeko', position: Position.FWD, location: 'Kadıköy', phone: '05557778899', birthDate: new Date('1986-03-17'), secondaryPosition: '' },
        { username: 'kerem', email: 'kerem@sahapro.com', full_name: 'Kerem Aktürkoğlu', position: Position.FWD, location: 'İstanbul', phone: '05558889900', birthDate: new Date('1998-10-21'), secondaryPosition: 'Orta Saha' },
        { username: 'ferdi', email: 'ferdi@sahapro.com', full_name: 'Ferdi Kadıoğlu', position: Position.DEF, location: 'Kadıköy', phone: '05559990011', birthDate: new Date('1999-10-07'), secondaryPosition: 'Orta Saha' },
        { username: 'baris', email: 'baris@sahapro.com', full_name: 'Barış Alper Yılmaz', position: Position.FWD, location: 'Rize', phone: '05550001122', birthDate: new Date('2000-05-23'), secondaryPosition: 'Orta Saha' },
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
                // Update existing user with new fields
                await usersService.update(exists.id, {
                    ...user
                });
                console.log(`Updated user: ${user.username}`);
            }
        } catch (error) {
            console.error(`Failed to create ${user.username}`, error);
        }
    }

    await app.close();
}

bootstrap();
