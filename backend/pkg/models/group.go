package models

import (
	"database/sql"
	"time"
)

// Group represents a group in the social network
type Group struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description sql.NullString `json:"description,omitempty"`
	CreatorID   string         `json:"creatorId"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

// GroupResponse is the JSON response for a group with member count
type GroupResponse struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description *string       `json:"description"`
	ImageURL    string        `json:"imageUrl,omitempty"`
	Creator     *UserResponse `json:"creator"`
	MemberCount int           `json:"memberCount"`
	Members     []GroupMember `json:"members,omitempty"`
	IsCreator    bool          `json:"isCreator"`
	IsMember     bool          `json:"isMember"`
	HasRequested bool          `json:"hasRequested"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

// GroupRequest is the JSON request for creating/updating a group
type GroupRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	ImageURL    *string `json:"imageUrl,omitempty"`
}

// GroupMember represents a member of a group
type GroupMember struct {
	ID       string        `json:"id"`
	GroupID  string        `json:"groupId"`
	UserID   string        `json:"userId"`
	User     *UserResponse `json:"user,omitempty"`
	Role     string        `json:"role"` // "creator" or "member"
	JoinedAt time.Time     `json:"joinedAt"`
}

// GroupInvitation represents an invitation to join a group
type GroupInvitation struct {
	ID        string        `json:"id"`
	GroupID   string        `json:"groupId"`
	UserID    string        `json:"userId"`
	User      *UserResponse `json:"user,omitempty"`
	InvitedBy string        `json:"invitedBy"`
	Status    string        `json:"status"` // "pending", "accepted", "declined"
	CreatedAt time.Time     `json:"createdAt"`
}

// GroupInvitationRequest is the JSON request for inviting a user
type GroupInvitationRequest struct {
	UserID string `json:"userId"`
}

// JoinRequest represents a request to join a group
type JoinRequest struct {
	ID        string        `json:"id"`
	GroupID   string        `json:"groupId"`
	UserID    string        `json:"userId"`
	User      *UserResponse `json:"user,omitempty"`
	Status    string        `json:"status"` // "pending", "accepted", "declined"
	CreatedAt time.Time     `json:"createdAt"`
}

// Event represents a group event
type Event struct {
	ID          string    `json:"id"`
	GroupID     string    `json:"groupId"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DateTime    time.Time `json:"dateTime"`
	CreatedByID string    `json:"createdById"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// EventOptionCount represents a response option with its count
type EventOptionCount struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Count int    `json:"count"`
}

// EventResponse is the JSON response for an event with creator info
type EventResponse struct {
	ID            string             `json:"id"`
	GroupID       string             `json:"groupId"`
	Title         string             `json:"title"`
	Description   string             `json:"description"`
	DateTime      time.Time          `json:"dateTime"`
	CreatedBy     *UserResponse      `json:"createdBy"`
	Options       []EventOptionCount `json:"options"`
	GoingCount    int                `json:"goingCount"`
	NotGoingCount int                `json:"notGoingCount"`
	UserResponse  string             `json:"userResponse"`
	CreatedAt     time.Time          `json:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt"`
}

// EventRequest is the JSON request for creating an event
type EventRequest struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DateTime    time.Time `json:"dateTime"`
	Options     []string  `json:"options"`
}

// EventRSVP represents a stored RSVP
type EventRSVP struct {
	ID        string    `json:"id"`
	EventID   string    `json:"eventId"`
	UserID    string    `json:"userId"`
	Response  string    `json:"response"`
	CreatedAt time.Time `json:"createdAt"`
}

// EventRSVPRequest is the JSON request for RSVP
type EventRSVPRequest struct {
	Response string `json:"response"` // option ID
}
