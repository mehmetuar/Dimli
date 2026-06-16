import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'reviewer' })
  role: string; // 'superadmin' | 'reviewer'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
