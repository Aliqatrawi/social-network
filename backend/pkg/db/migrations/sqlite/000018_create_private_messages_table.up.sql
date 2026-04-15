CREATE TABLE IF NOT EXISTS private_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_private_messages_conversation_id ON private_messages(conversation_id);
CREATE INDEX idx_private_messages_conversation_created_at ON private_messages(conversation_id, created_at DESC);
CREATE INDEX idx_private_messages_receiver_is_read ON private_messages(receiver_id, is_read);
CREATE INDEX idx_private_messages_created_at ON private_messages(created_at DESC);
