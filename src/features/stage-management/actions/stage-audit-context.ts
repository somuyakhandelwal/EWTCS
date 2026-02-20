'use server';

import { requireAdminWrite } from '@/shared/lib/auth';
import { headers } from 'next/headers';
import { getClientIpFromHeaders } from '@/shared/lib/request-ip';

export type StageAuditActor = {
  userId: string;
  username: string;
  role: string;
  ipAddress: string | null;
};

export async function getStageAuditContext(): Promise<StageAuditActor> {
  const session = await requireAdminWrite({
    actionType: 'UPDATE',
    entityType: 'stage',
    entityId: 'configuration',
  });
  const requestHeaders = await headers();
  const ipAddress = getClientIpFromHeaders(requestHeaders);

  return {
    userId: session.userId,
    username: session.username,
    role: session.role,
    ipAddress,
  };
}

export async function getStageAuditMetadata(actor: { username: string; role: string }) {
  return { category: 'configuration', username: actor.username, role: actor.role };
}