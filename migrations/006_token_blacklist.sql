-- Up Migration
CREATE TABLE token_blacklist (
    token TEXT PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- Down Migration
DROP TABLE token_blacklist;
