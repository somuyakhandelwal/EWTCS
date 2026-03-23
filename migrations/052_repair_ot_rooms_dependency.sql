-- Migration 052: Repair missing ot_rooms dependency
-- Purpose: Recover databases impacted by earlier SQL runner behavior
-- Safe to run repeatedly.

-- Up Migration

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'ot_room_status'
    ) THEN
        CREATE TYPE ot_room_status AS ENUM ('available', 'ongoing');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS ot_rooms (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_number   TEXT NOT NULL UNIQUE,
    status        ot_room_status NOT NULL DEFAULT 'available',
    started_at    TIMESTAMP WITH TIME ZONE,
    updated_by    UUID REFERENCES users(id),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ot_rooms_status ON ot_rooms(status);

INSERT INTO ot_rooms (room_number, status) VALUES
    ('OT-01', 'available'), ('OT-02', 'available'),
    ('OT-03', 'available'), ('OT-04', 'available'),
    ('OT-05', 'available'), ('OT-06', 'available'),
    ('OT-07', 'available'), ('OT-08', 'available'),
    ('OT-09', 'available'), ('OT-10', 'available'),
    ('OT-11', 'available'), ('OT-12', 'available'),
    ('OT-13', 'available'), ('OT-14', 'available'),
    ('OT-15', 'available'), ('OT-16', 'available')
ON CONFLICT (room_number) DO NOTHING;

-- Down Migration
-- No-op: this repair migration is intentionally irreversible.
