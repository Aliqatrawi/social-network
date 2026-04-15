package models

import (
	"database/sql"
	"time"
)

// PrivacyLevel represents the privacy level of a post
type PrivacyLevel string

const (
	PrivacyPublic        PrivacyLevel = "public"
	PrivacyAlmostPrivate PrivacyLevel = "almost_private"
	PrivacyPrivate       PrivacyLevel = "private"
)

// Post represents a post in the social network
type Post struct {
	ID           string         `json:"id"`
	UserID       string         `json:"userId"`
	Title        string         `json:"title"`
	Content      string         `json:"content"`
	ImageURL     sql.NullString `json:"imageUrl,omitempty"`
	PrivacyLevel PrivacyLevel   `json:"privacyLevel"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
}

// PostRequest is the JSON request for creating/updating a post
type PostRequest struct {
	Content      string       `json:"content"`
	ImageURL     *string      `json:"imageUrl,omitempty"`
	PrivacyLevel PrivacyLevel `json:"privacyLevel"`
	// SelectedFollowers is a list of follower IDs for almost_private posts
	SelectedFollowers []string `json:"selectedFollowers,omitempty"`
}

// PostResponse is the JSON response for a post with user info
type PostResponse struct {
	ID           string        `json:"id"`
	UserID       string        `json:"userId"`
	Author       *UserResponse `json:"author"`
	Title        string        `json:"title"`
	Content      string        `json:"content"`
	ImageURL     *string       `json:"imageUrl,omitempty"`
	Privacy      PrivacyLevel  `json:"privacy"`
	GroupID      *string       `json:"groupId,omitempty"`
	CommentCount int           `json:"commentCount"`
	Tags         []string      `json:"tags"`
	LikeCount    int           `json:"likeCount"`
	DislikeCount int           `json:"dislikeCount"`
	UserReaction  *string       `json:"userReaction"`
	ContentFormat string        `json:"contentFormat"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}

// PostVisibility stores which users can view a private post
type PostVisibility struct {
	ID     string `json:"id"`
	PostID string `json:"postId"`
	UserID string `json:"userId"`
}

// Comment represents a comment on a post
type Comment struct {
	ID        string         `json:"id"`
	PostID    string         `json:"postId"`
	UserID    string         `json:"userId"`
	Content   string         `json:"content"`
	ImageURL  sql.NullString `json:"imageUrl,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

// CommentRequest is the JSON request for creating/updating a comment
type CommentRequest struct {
	Content  string  `json:"content"`
	ImageURL *string `json:"imageUrl,omitempty"`
}

// CommentResponse is the JSON response for a comment with user info
type CommentResponse struct {
	ID        string        `json:"id"`
	PostID    string        `json:"postId"`
	UserID    string        `json:"userId"`
	Author    *UserResponse `json:"author"`
	Content   string        `json:"content"`
	ImageURL  *string       `json:"imageUrl,omitempty"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
}
