# External Integration API Guide

## Overview
The Hospital Management System provides a read-only REST API to facilitate integration with other external hospital systems. This API is available to securely share bed status and performance reports.

## Authentication
All API endpoints require authentication using an API Key. 
- **Header Field**: `x-api-key`
- **Configuration**: The API key is defined in the environment variable `EXTERNAL_API_KEY`. If not set, it defaults to `default-hospital-api-key` (for local development only).

Example:
```bash
curl -X GET https://your-domain.com/api/external/beds -H "x-api-key: your-api-key"
```

## Rate Limiting
To ensure system stability, the external API enforces rate limiting based on the requester's IP address:
- **`/api/external/beds`**: 60 requests per minute
- **`/api/external/reports`**: 30 requests per minute

When the limit is exceeded, the server will return a `429 Too Many Requests` status code.

## Endpoints

### 1. Bed Status
Retrieve a real-time, read-only list of all beds and their current status.

**Endpoint**: `GET /api/external/beds`

**Response Example**:
```json
{
  "status": "success",
  "data": {
    "beds": [
      {
        "id": "cm7vehy0k0004x30cfu7p0zvy",
        "label": "Bed 1A",
        "status": "OCCUPIED",
        "department": "ICU",
        "isActive": true
      }
    ]
  }
}
```

### 2. Bed Performance Reports
Retrieve aggregated bed performance metrics over a specific time period.

**Endpoint**: `GET /api/external/reports`

**Query Parameters**:
- `startDate` (optional): Start of the report period in ISO 8601 format (e.g., `2024-01-01T00:00:00Z`). Defaults to 30 days ago.
- `endDate` (optional): End of the report period in ISO 8601 format. Defaults to current time.

## Interactive Documentation
Swagger/OpenAPI documentation is available interactively within the application. Navigate to `/swagger.html` in your browser to view the schema and test the endpoints directly from the interface.

## Outbound Webhooks (issue-117)

In addition to pull-based REST APIs, EWTCS supports push-based outbound webhooks for critical events.

### Event Types
- `bed.status.changed`
- `bed.delay.threshold.exceeded`

### Delivery Security
Every webhook POST includes these headers:
- `X-EWTCS-Event`
- `X-EWTCS-Event-Id`
- `X-EWTCS-Timestamp`
- `X-EWTCS-Signature`

Signature format:
- `sha256=<hex_digest>`
- HMAC input: `${timestamp}\n${rawJsonPayload}`

### Retry and Logging
- Failed deliveries are retried with exponential backoff.
- Attempt-level logs are persisted for observability and incident response.
- Non-retryable failures are marked dead-letter after retry budget is exhausted.

### Operational Trigger
Webhook queue processing is executed via:
- `POST /api/cron/webhooks/dispatch`
- Auth: `Authorization: Bearer <CRON_SECRET>`

Recommended production cadence: run this endpoint every minute.

### Endpoint Configuration API
Admins configure webhook receivers through:
- `GET /api/webhooks/endpoints`
- `POST /api/webhooks/endpoints`
- `PATCH /api/webhooks/endpoints`
- `DELETE /api/webhooks/endpoints?id=<uuid>`

`subscribedEvents` currently supports:
- `bed.status.changed`
- `bed.delay.threshold.exceeded`
