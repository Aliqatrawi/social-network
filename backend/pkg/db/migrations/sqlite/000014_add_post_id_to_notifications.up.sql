ALTER TABLE notifications ADD COLUMN post_id TEXT REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN post_title TEXT;
