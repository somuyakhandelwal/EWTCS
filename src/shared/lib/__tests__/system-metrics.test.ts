import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSystemMetrics, recordRequest } from '../system-metrics';
import { logger } from '@/shared/config/logger';

vi.mock('@/shared/config/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('system-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates metrics correctly', async () => {
    recordRequest('user1');
    recordRequest('user2');
    recordRequest('user1'); // duplicate user

    const metrics = await getSystemMetrics();
    
    expect(metrics).toHaveProperty('cpu');
    expect(metrics).toHaveProperty('memory');
    expect(metrics).toHaveProperty('disk');
    expect(metrics).toHaveProperty('requestsPerMin');
    expect(metrics).toHaveProperty('activeUsers');
    
    // We expect at least 2 unique users recorded above (if reset didn't happen)
    // Note: Since variables are module-level and not reset in this test specifically, 
    // it depends on the initial state. But we can at least check it's a number.
    expect(typeof metrics.activeUsers).toBe('number');
    expect(metrics.activeUsers).toBeGreaterThanOrEqual(2);
  });

  it('logs info when metrics are retrieved', async () => {
    await getSystemMetrics();
    expect(logger.info).toHaveBeenCalledWith(
      'System health metrics recorded for trend analysis',
      expect.any(Object)
    );
  });
});
