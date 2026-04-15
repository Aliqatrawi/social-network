CREATE TABLE events (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date_time DATETIME NOT NULL,
    created_by_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_group_id ON events(group_id);
CREATE INDEX idx_events_created_by_id ON events(created_by_id);
CREATE INDEX idx_events_date_time ON events(date_time DESC);
