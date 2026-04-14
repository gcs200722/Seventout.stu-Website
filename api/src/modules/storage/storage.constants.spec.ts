import { STORAGE_PORT } from './storage.constants';

describe('storage constants', () => {
  it('exposes storage token symbol', () => {
    expect(typeof STORAGE_PORT).toBe('symbol');
  });
});
