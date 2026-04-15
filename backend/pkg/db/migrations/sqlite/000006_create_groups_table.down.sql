-- Remove group_id from posts table
ALTER TABLE posts DROP COLUMN group_id;

-- Drop groups table
DROP TABLE IF EXISTS groups;
