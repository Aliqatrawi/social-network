CREATE TABLE IF NOT EXISTS post_tags (
    post_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (post_id, tag),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_tags_tag ON post_tags(tag);
