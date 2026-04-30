import { Repository } from 'typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service';

describe('RefreshTokenCleanupService', () => {
  let service: RefreshTokenCleanupService;
  let refreshTokensRepository: jest.Mocked<Repository<RefreshTokenEntity>>;
  let deleteMock: jest.Mock;

  beforeEach(() => {
    deleteMock = jest.fn();
    refreshTokensRepository = {
      delete: deleteMock,
    } as unknown as jest.Mocked<Repository<RefreshTokenEntity>>;

    service = new RefreshTokenCleanupService(refreshTokensRepository);
  });

  it('should_delete_expired_tokens_when_cron_runs', async () => {
    refreshTokensRepository.delete.mockResolvedValue({
      affected: 2,
    } as never);
    const logSpy = jest
      .spyOn(service['logger'], 'log')
      .mockImplementation(() => undefined);

    await service.deleteExpiredRefreshTokens();

    expect(deleteMock).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Deleted 2 expired refresh token(s)');
  });

  it('should_not_log_when_no_token_deleted', async () => {
    refreshTokensRepository.delete.mockResolvedValue({
      affected: 0,
    } as never);
    const logSpy = jest
      .spyOn(service['logger'], 'log')
      .mockImplementation(() => undefined);

    await service.deleteExpiredRefreshTokens();

    expect(logSpy).not.toHaveBeenCalled();
  });
});
