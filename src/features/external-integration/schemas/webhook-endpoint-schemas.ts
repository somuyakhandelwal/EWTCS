import { z } from 'zod'
import type { WebhookEventType } from '@/features/external-integration/types/webhook.types'

export const eventTypes = ['bed.status.changed', 'bed.delay.threshold.exceeded'] as const

export const createWebhookEndpointSchema = z.object({
  name: z.string().min(1).max(100),
  targetUrl: z.string().url().max(1000),
  signingSecret: z.string().min(16).max(512),
  subscribedEvents: z.array(z.enum(eventTypes)).min(1),
  timeoutMs: z.number().int().positive().max(120000).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  retryBackoffBaseMs: z.number().int().positive().max(120000).optional(),
})

export const updateWebhookEndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  targetUrl: z.string().url().max(1000).optional(),
  signingSecret: z.string().min(16).max(512).optional(),
  subscribedEvents: z.array(z.enum(eventTypes)).min(1).optional(),
  timeoutMs: z.number().int().positive().max(120000).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  retryBackoffBaseMs: z.number().int().positive().max(120000).optional(),
  isActive: z.boolean().optional(),
})

export type WebhookEndpointRow = {
  id: string
  name: string
  targetUrl: string
  subscribedEvents: WebhookEventType[]
  isActive: boolean
  timeoutMs: number
  maxRetries: number
  retryBackoffBaseMs: number
  createdAt: string
  updatedAt: string
}
