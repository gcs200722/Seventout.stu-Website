import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CmsPageEntity } from './cms-page.entity';

@Entity({ name: 'cms_themes' })
@Index('uq_cms_themes_slug', ['slug'], { unique: true })
export class CmsThemeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  tokens: Record<string, string>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => CmsPageEntity, (page) => page.theme)
  pages: CmsPageEntity[];
}
