import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CmsApplicationService } from './cms.application.service';
import { CmsRepository } from './cms.repository';
import {
  CMS_PUBLISHED_CACHE_PORT,
  type CmsPublishedCachePort,
} from './cms-published-cache.port';

describe('CmsApplicationService', () => {
  let service: CmsApplicationService;
  const cacheGetSerialized = jest.fn();
  const cacheSetSerialized = jest.fn();
  const cacheInvalidate = jest.fn();
  const cache: jest.Mocked<CmsPublishedCachePort> = {
    getSerialized: cacheGetSerialized,
    setSerialized: cacheSetSerialized,
    invalidate: cacheInvalidate,
  };
  const cmsRepository: jest.Mocked<Pick<CmsRepository, keyof CmsRepository>> = {
    findPageByKey: jest.fn(),
    findPageById: jest.fn(),
    findPageTreeByKey: jest.fn(),
    findPageTreeById: jest.fn(),
    listPages: jest.fn(),
    createPage: jest.fn(),
    createSection: jest.fn(),
    createBlock: jest.fn(),
    updateSection: jest.fn(),
    updateBlock: jest.fn(),
    softDeleteSection: jest.fn(),
    softDeleteBlock: jest.fn(),
    listSectionIdsForPage: jest.fn(),
    reorderSections: jest.fn(),
    getSectionWithPage: jest.fn(),
    getBlockWithPageKey: jest.fn(),
  } as unknown as jest.Mocked<CmsRepository>;

  const dataSource = {
    transaction: jest.fn(async (fn: () => Promise<void>) => fn()),
  } as unknown as DataSource;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CmsApplicationService,
        { provide: CmsRepository, useValue: cmsRepository },
        { provide: CMS_PUBLISHED_CACHE_PORT, useValue: cache },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_k: string, def?: number) => def ?? 600) },
        },
      ],
    }).compile();

    service = moduleRef.get(CmsApplicationService);
  });

  it('getPublishedPageByKey returns cached JSON when present', async () => {
    const payload = {
      id: 'p1',
      key: 'homepage',
      title: 'Homepage',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sections: [],
    };
    cacheGetSerialized.mockResolvedValue(JSON.stringify(payload));

    const result = await service.getPublishedPageByKey('homepage');

    expect(result).toEqual(payload);
    expect(cmsRepository.findPageTreeByKey).not.toHaveBeenCalled();
  });

  it('reorderSections rejects duplicate ids', async () => {
    cmsRepository.findPageById.mockResolvedValue({
      id: 'page-1',
      pageKey: 'homepage',
    } as never);
    cmsRepository.listSectionIdsForPage.mockResolvedValue(['a', 'b']);

    await expect(
      service.reorderSections('page-1', ['a', 'a']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cmsRepository.reorderSections).not.toHaveBeenCalled();
    expect(cacheInvalidate).not.toHaveBeenCalled();
  });

  it('reorderSections rejects unknown id', async () => {
    cmsRepository.findPageById.mockResolvedValue({
      id: 'page-1',
      pageKey: 'homepage',
    } as never);
    cmsRepository.listSectionIdsForPage.mockResolvedValue(['a', 'b']);

    await expect(
      service.reorderSections('page-1', ['a', 'c']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reorderSections updates order and invalidates cache', async () => {
    cmsRepository.findPageById.mockResolvedValue({
      id: 'page-1',
      pageKey: 'homepage',
    } as never);
    cmsRepository.listSectionIdsForPage.mockResolvedValue(['a', 'b']);
    cmsRepository.reorderSections.mockResolvedValue(undefined);
    cmsRepository.findPageTreeById.mockResolvedValue({
      id: 'page-1',
      pageKey: 'homepage',
      title: 'Home',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      sections: [],
    } as never);

    await service.reorderSections('page-1', ['b', 'a']);

    expect(cmsRepository.reorderSections).toHaveBeenCalledWith('page-1', [
      'b',
      'a',
    ]);
    expect(cacheInvalidate).toHaveBeenCalledWith('homepage');
  });

  it('getPublishedPageByKey throws when page missing', async () => {
    cacheGetSerialized.mockResolvedValue(null);
    cmsRepository.findPageTreeByKey.mockResolvedValue(null);

    await expect(
      service.getPublishedPageByKey('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
