package models

import (
	"time"
)

// NotificationType represents the type of notification
type NotificationType string

const (
	NotificationFollowRequest    NotificationType = "follow_request"
	NotificationFollowAccepted   NotificationType = "follow_accepted"
	NotificationFollowDeclined   NotificationType = "follow_declined"
	NotificationNewFollower      NotificationType = "new_follower"
	NotificationComment          NotificationType = "comment"
	NotificationLike             NotificationType = "like"
	NotificationDislike          NotificationType = "dislike"
	NotificationGroupInvitation  NotificationType = "group_invitation"
	NotificationGroupJoinRequest NotificationType = "group_join_request"
	NotificationGroupEvent       NotificationType = "group_event"
	NotificationGroupKicked      NotificationType = "group_kicked"
	NotificationGroupMemberLeft  NotificationType = "group_member_left"
	NotificationGroupJoinAccepted       NotificationType = "group_join_accepted"
	NotificationGroupInvitationDeclined NotificationType = "group_invitation_declined"
)

// Notification represents a notification in the system
type Notification struct {
	ID            string           `json:"id"`
	UserID        string           `json:"userId"`
	Type          NotificationType `json:"type"`
	Title         string           `json:"title"`
	Message       string           `json:"message"`
	RelatedUserID string           `json:"relatedUserId,omitempty"` // User who triggered (for follow request, group invite)
	RelatedUser   *UserResponse    `json:"relatedUser,omitempty"`
	GroupID       string           `json:"groupId,omitempty"` // For group-related notifications
	GroupName     string           `json:"groupName,omitempty"`
	EventID       string           `json:"eventId,omitempty"` // For event notifications
	EventTitle    string           `json:"eventTitle,omitempty"`
	IsRead        bool             `json:"isRead"`
	CreatedAt     time.Time        `json:"createdAt"`
	UpdatedAt     time.Time        `json:"updatedAt"`
}

// NotificationMetadata holds optional related IDs for a notification
type NotificationMetadata struct {
	PostID     string `json:"postId,omitempty"`
	PostTitle  string `json:"postTitle,omitempty"`
	CommentID  string `json:"commentId,omitempty"`
	GroupID    string `json:"groupId,omitempty"`
	GroupName  string `json:"groupName,omitempty"`
	EventID    string `json:"eventId,omitempty"`
	EventTitle string `json:"eventTitle,omitempty"`
}

// NotificationResponse is the JSON response for a notification
type NotificationResponse struct {
	ID            string                `json:"id"`
	UserID        string                `json:"userId"`
	Type          NotificationType      `json:"type"`
	ActorID       string                `json:"actorId,omitempty"`
	Actor         *UserResponse         `json:"actor,omitempty"`
	IsRead        bool                  `json:"isRead"`
	ActionPending bool                  `json:"actionPending"`
	CreatedAt     time.Time             `json:"createdAt"`
	Metadata      *NotificationMetadata `json:"metadata,omitempty"`
}

// NotificationRequest is used for marking notifications as read
type NotificationRequest struct {
	IsRead bool `json:"isRead"`
}
