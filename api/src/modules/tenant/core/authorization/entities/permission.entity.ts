import { Column, Entity, ManyToMany, PrimaryColumn } from 'typeorm';
import { UserEntity } from '../../users/user.entity';

@Entity({ name: 'permissions' })
export class PermissionEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @ManyToMany(() => UserEntity, (user) => user.permissions)
  users: UserEntity[];
}
