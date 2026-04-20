import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'cms_assets' })
@Index('idx_cms_assets_created_at', ['createdAt'])
export class CmsAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'object_key', type: 'varchar', length: 512, unique: true })
  objectKey: string;

  @Column({ name: 'public_url', type: 'text' })
  publicUrl: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  mime: string;

  @Column({ type: 'varchar', length: 512, default: '' })
  alt: string;

  @Column({ name: 'focal_x', type: 'double precision', nullable: true })
  focalX: number | null;

  @Column({ name: 'focal_y', type: 'double precision', nullable: true })
  focalY: number | null;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
