import { DEFAULT_QUEUE_NAME, QUEUE_PORT } from './queue.constants';

describe('queue constants', () => {
  it('exposes expected queue token and default queue name', () => {
    expect(typeof QUEUE_PORT).toBe('symbol');
    expect(DEFAULT_QUEUE_NAME).toBe('default');
  });
});
