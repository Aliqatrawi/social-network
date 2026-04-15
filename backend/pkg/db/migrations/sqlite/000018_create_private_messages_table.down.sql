DROP INDEX IF EXISTS idx_private_messages_created_at;
DROP INDEX IF EXISTS idx_private_messages_receiver_is_read;
DROP INDEX IF EXISTS idx_private_messages_conversation_created_at;
DROP INDEX IF EXISTS idx_private_messages_conversation_id;

DROP TABLE IF EXISTS private_messages;
