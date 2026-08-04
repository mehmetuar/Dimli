import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Poll } from './poll.entity';

@Index(['pollId'])
@Entity('poll_options')
export class PollOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pollId: string;

  @ManyToOne(() => Poll, (poll) => poll.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pollId' })
  poll: Poll;

  @Column({ type: 'varchar', length: 100 })
  text: string;

  // Oluşturma sırası korunur (kaptanın girdiği dizilim)
  @Column({ type: 'int' })
  sortOrder: number;
}
