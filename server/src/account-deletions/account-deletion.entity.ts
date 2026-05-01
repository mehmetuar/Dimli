import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('account_deletions')
export class AccountDeletion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    reason: string;

    @Column({ nullable: true, type: 'text' })
    note: string | null;

    @Column({ nullable: true, type: 'varchar' })
    userName: string | null;

    @Column({ nullable: true, type: 'varchar' })
    userEmail: string | null;

    @Column({ nullable: true, type: 'varchar' })
    userPhone: string | null;

    @Column({ nullable: true, type: 'varchar' })
    userUsername: string | null;

    @CreateDateColumn()
    deletedAt: Date;
}
