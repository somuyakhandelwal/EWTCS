-- Migration 045: OT Room Occupancy (US-23.1, EPIC-23)
-- Creates 16 dedicated OT rooms with Available/Ongoing status

-- Up Migration

CREATE TYPE ot_room_status AS ENUM ('available', 'ongoing');

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

-- Seed OT-01 to OT-16
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

DROP TABLE IF EXISTS ot_rooms;
DROP TYPE IF EXISTS ot_room_status;
