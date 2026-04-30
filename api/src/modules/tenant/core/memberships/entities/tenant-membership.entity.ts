import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEntity } from '../../../../platform/tenants/entities/tenant.entity';
import { UserEntity } from '../../users/user.entity';

export enum TenantMembershipRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  STAFF = 'staff',
}

export enum TenantMembershipStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  REVOKED = 'revoked',
}

@Entity({ name: 'tenant_memberships' })
@Unique('uq_tenant_memberships_user_tenant', ['userId', 'tenantId'])
@Check(
  'chk_tenant_memberships_role',
  `"role" IN ('owner', 'admin', 'staff')`,
)
@Check(
  'chk_tenant_memberships_status',
  `"status" IN ('active', 'invited', 'revoked')`,
)
export class TenantMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.tenantMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.tenantMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @Column({
    type: 'varchar',
    length: 20,
    default: TenantMembershipRole.STAFF,
  })
  role: TenantMembershipRole;

  @Column({
    type: 'varchar',
    length: 20,
    default: TenantMembershipStatus.ACTIVE,
  })
  status: TenantMembershipStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
