import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const openapi = {
        openapi: '3.0.0',
        info: {
            title: 'Hospital External Integration API',
            version: '1.0.0',
            description: 'Read-only API endpoints for external hospital systems integration.',
        },
        servers: [{ url: '/api/external' }],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                },
            },
        },
        security: [{ ApiKeyAuth: [] }],
        paths: {
            '/beds': {
                get: {
                    summary: 'Get Bed Status',
                    description: 'Retrieve a read-only list of all beds and their current status.',
                    responses: {
                        '200': { description: 'Successful response' },
                        '401': { description: 'Unauthorized - invalid or missing x-api-key' },
                        '429': { description: 'Too Many Requests - rate limit exceeded' },
                        '500': { description: 'Internal Server Error' }
                    },
                },
            },
            '/reports': {
                get: {
                    summary: 'Get Bed Performance Report',
                    description: 'Retrieve read-only bed performance reports over a specific period.',
                    parameters: [
                        {
                            name: 'startDate',
                            in: 'query',
                            schema: { type: 'string', format: 'date-time' },
                            description: 'Start date for the report (e.g. 2024-01-01T00:00:00Z)',
                        },
                        {
                            name: 'endDate',
                            in: 'query',
                            schema: { type: 'string', format: 'date-time' },
                            description: 'End date for the report (e.g. 2024-01-31T23:59:59Z)',
                        },
                    ],
                    responses: {
                        '200': { description: 'Successful response' },
                        '401': { description: 'Unauthorized - invalid or missing x-api-key' },
                        '429': { description: 'Too Many Requests - rate limit exceeded' },
                        '500': { description: 'Internal Server Error' }
                    },
                },
            },
        },
    }

    return NextResponse.json(openapi)
}
