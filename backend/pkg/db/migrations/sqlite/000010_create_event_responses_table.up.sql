CREATE TABLE event_responses (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    response TEXT NOT NULL, -- 'going' or 'not_going'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_responses_event_id ON event_responses(event_id);
CREATE INDEX idx_event_responses_user_id ON event_responses(user_id);
CREATE INDEX idx_event_responses_response ON event_responses(response);
