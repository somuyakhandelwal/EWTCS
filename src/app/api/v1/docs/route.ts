/**
 * OpenAPI Documentation Endpoint
 * US-19.1: REST API documentation (Swagger/OpenAPI 3.0)
 *
 * GET /api/v1/docs
 *   Returns the OpenAPI 3.0 spec for the EWTCS external API.
 *   Publicly accessible (no API key required — spec only, no data).
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'EWTCS External API',
    version: '1.0.0',
    description:
      'Read-only REST API for the Emergency Ward Tracking & Coordination System. ' +
      'Allows authorised external hospital systems to query live bed status and aggregated reports.',
    contact: {
      name: 'EWTCS Support',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current API version',
    },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Use the EXTERNAL_API_KEY configured on the server.',
      },
    },
    schemas: {
      BedStatus: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          bedNumber: { type: 'string', example: 'A1' },
          ward: { type: 'string', nullable: true, example: 'Emergency' },
          currentStage: { type: 'string', nullable: true, example: 'Assessment' },
          currentStageColor: { type: 'string', nullable: true, example: '#3B82F6' },
          isOccupied: { type: 'boolean' },
          isDelayed: { type: 'boolean', description: 'True if patient has been in ward > 3 hours' },
          elapsedMinutes: { type: 'integer', nullable: true, description: 'Minutes since patient admission' },
        },
      },
      ReportMetrics: {
        type: 'object',
        properties: {
          totalPatients: { type: 'integer' },
          avgTatMs: { type: 'integer', nullable: true, description: 'Average turnaround time in milliseconds' },
          delayedCount: { type: 'integer' },
          delayRate: { type: 'number', format: 'float', description: 'Fraction of transitions that were delayed (0-1)' },
          targetDelayRate: { type: 'number', format: 'float', example: 0.1 },
        },
      },
      DailyTrend: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date', example: '2026-03-01' },
          patientCount: { type: 'integer' },
          avgTatMs: { type: 'integer', nullable: true },
          delayedCount: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/beds': {
      get: {
        summary: 'Get current bed statuses',
        description: 'Returns the real-time status of all active beds in the facility.',
        operationId: 'getBeds',
        responses: {
          '200': {
            description: 'Current bed status snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    beds: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/BedStatus' },
                    },
                    generatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { description: 'Missing or invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'Rate limit exceeded (60 req/min)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '503': { description: 'External API not configured on this server', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/reports': {
      get: {
        summary: 'Get aggregate report metrics',
        description: 'Returns KPI metrics and daily trend data for a given date range (max 31 days).',
        operationId: 'getReports',
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date', example: '2026-03-01' },
            description: 'Start of the reporting period (inclusive)',
          },
          {
            name: 'endDate',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date', example: '2026-03-07' },
            description: 'End of the reporting period (inclusive)',
          },
        ],
        responses: {
          '200': {
            description: 'Report metrics and trend data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    metrics: { $ref: '#/components/schemas/ReportMetrics' },
                    trend: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/DailyTrend' },
                    },
                    dateRange: {
                      type: 'object',
                      properties: {
                        start: { type: 'string', format: 'date' },
                        end:   { type: 'string', format: 'date' },
                      },
                    },
                    generatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Missing or invalid query parameters', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Missing or invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '422': { description: 'Date range exceeds 31-day limit', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'Rate limit exceeded (60 req/min)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/docs': {
      get: {
        summary: 'OpenAPI specification',
        description: 'Returns this OpenAPI 3.0 specification in JSON format.',
        operationId: 'getDocs',
        security: [],
        responses: {
          '200': {
            description: 'OpenAPI specification',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(OPENAPI_SPEC, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',  // Docs are public
    },
  })
}
