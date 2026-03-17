import os from 'os';
import fs from 'fs/promises';
import { logger } from '@/shared/config/logger';

// In-memory stats for tracking across Edge/Node isolate if possible
let requestCount = 0;
let lastReset = Date.now();
const activeUsers = new Set<string>();

/**
 * Epic 13: Records a new incoming request.
 * Increments request count and tracks unique active users for calculating metrics.
 * @param userId - Optional user identifier to track active sessions
 */
export function recordRequest(userId?: string) {
  requestCount++;
  if (userId) activeUsers.add(userId);
}

/**
 * Retrieves core system health metrics (Epic 13) including CPU load,
 * memory usage, disk space remaining, requests rate, and active users.
 * Automatically logs warnings if thresholds (CPU > 80%, Mem > 80%, Disk > 90%) are exceeded.
 */
export async function getSystemMetrics() {
  const now = Date.now();
  const elapsedMinutes = (now - lastReset) / 60000;
  
  // Reset window every hour to get a fresh rate
  if (elapsedMinutes > 60) {
    requestCount = 0;
    lastReset = now;
    activeUsers.clear();
  }

  const rate = elapsedMinutes > 0 ? (requestCount / elapsedMinutes) : 0;
  const cpuUsage = os.loadavg()[0] * 100; // Load average approximation
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memoryUsage = memTotal > 0 ? ((memTotal - memFree) / memTotal) * 100 : 0;

  let diskUsage = 0;
  try {
    const stats = await fs.statfs('/');
    const diskTotal = stats.blocks * stats.bsize;
    const diskFree = stats.bfree * stats.bsize;
    if (diskTotal > 0) diskUsage = ((diskTotal - diskFree) / diskTotal) * 100;
  } catch (error) {
    diskUsage = 0; // fallback if unsupported
  }

  const metrics = {
    cpu: Number(cpuUsage.toFixed(1)),
    memory: Number(memoryUsage.toFixed(1)),
    disk: Number(diskUsage.toFixed(1)),
    requestsPerMin: Number(rate.toFixed(1)),
    activeUsers: activeUsers.size,
  };

  if (metrics.cpu > 80) logger.warn('High CPU usage detected', metrics);
  if (metrics.memory > 80) logger.warn('High memory usage detected', metrics);
  if (metrics.disk > 90) logger.warn('High disk usage detected', metrics);

  logger.info('System health metrics recorded for trend analysis', metrics);

  return metrics;
}
