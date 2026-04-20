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
import { CmsSectionEntity } from './cms-section.entity';
import { CmsThemeEntity } from './cms-theme.entity';

@Entity({ name: 'cms_pages' })
@Index('uq_cms_pages_page_key', ['pageKey'], { unique: true })
export class CmsPageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'page_key', type: 'varchar', length: 64 })
  pageKey: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'theme_id', type: 'uuid', nullable: true })
  themeId: string | null;

  @ManyToOne(() => CmsThemeEntity, (theme) => theme.pages, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'theme_id' })
  theme: CmsThemeEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => CmsSectionEntity, (section) => section.page)
  sections: CmsSectionEntity[];
}
