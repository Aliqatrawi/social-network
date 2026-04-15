CREATE TABLE IF NOT EXISTS event_options (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    label TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_event_options_event_id ON event_options(event_id);
