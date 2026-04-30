import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CmsBlockEntity } from './cms-block.entity';
import { CmsPageEntity } from './cms-page.entity';

@Entity({ name: 'cms_sections' })
@Index('idx_cms_sections_page_sort', ['pageId', 'sortOrder'])
export class CmsSectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'page_id', type: 'uuid' })
  pageId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => CmsPageEntity, (page) => page.sections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'page_id' })
  page: CmsPageEntity;

  @Column({ type: 'varchar', length: 64 })
  type: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  title: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  layout: Record<string, unknown>;

  /** Device / audience targeting stub (e.g. `{ "device": "mobile" }`). */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  targeting: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => CmsBlockEntity, (block) => block.section)
  blocks: CmsBlockEntity[];
}
