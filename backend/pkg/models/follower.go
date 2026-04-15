package models

import (
	"time"
)

// FollowStatus represents the status of a follow relationship
type FollowStatus string

const (
	FollowStatusPending  FollowStatus = "pending"
	FollowStatusAccepted FollowStatus = "accepted"
)

// Follower represents a follow relationship between users
type Follower struct {
	ID          string       `json:"id"`
	FollowerID  string       `json:"followerId"`  // The user who follows
	FollowingID string       `json:"followingId"` // The user being followed
	Status      FollowStatus `json:"status"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

// FollowResponse is returned after follow action
type FollowResponse struct {
	Status string `json:"status"` // "following" or "requested"
}
