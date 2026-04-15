CREATE TABLE IF NOT EXISTS private_conversations (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- enforce deterministic ordering for the unique pair
    CHECK (user1_id <> user2_id),
    CHECK (user1_id < user2_id),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user1_id, user2_id)
);

CREATE INDEX idx_private_conversations_user1_id ON private_conversations(user1_id);
CREATE INDEX idx_private_conversations_user2_id ON private_conversations(user2_id);
CREATE INDEX idx_private_conversations_updated_at ON private_conversations(updated_at DESC);
