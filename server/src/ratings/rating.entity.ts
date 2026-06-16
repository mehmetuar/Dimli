import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Reservation } from '../reservations/entities/reservation.entity';

@Entity('ratings')
@Unique(['reservationId', 'ratedByUserId', 'type'])
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['BUSINESS', 'FAIRPLAY'] })
  type: 'BUSINESS' | 'FAIRPLAY';

  @Column()
  reservationId: string;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column()
  ratedByUserId: string;

  // Populated when type === 'BUSINESS'
  @Column({ type: 'varchar', nullable: true })
  targetBusinessId: string | null;

  // Populated when type === 'FAIRPLAY'
  @Column({ type: 'varchar', nullable: true })
  targetTeamId: string | null;

  @Column({ type: 'smallint' })
  score: number; // 1-5

  @CreateDateColumn()
  createdAt: Date;
}
