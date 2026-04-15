package models

import "time"

// Conversation represents either a private or group chat entry shown in the chat list.
type Conversation struct {
	ID          string `json:"id"`
	Type        string `json:"type"` // "private" | "group"
	Participant *struct {
		UserID    string  `json:"userId"`
		FirstName string  `json:"firstName"`
		LastName  string  `json:"lastName"`
		AvatarURL *string `json:"avatarUrl,omitempty"`
	} `json:"participant,omitempty"`
	Group *struct {
		GroupID     string  `json:"groupId"`
		Title       string  `json:"title"`
		ImageURL    *string `json:"imageUrl,omitempty"`
		MemberCount int     `json:"memberCount"`
	} `json:"group,omitempty"`
	LastMessage *struct {
		Content    string `json:"content"`
		SenderID   string `json:"senderId"`
		SenderName string `json:"senderName"`
		CreatedAt  string `json:"createdAt"`
	} `json:"lastMessage,omitempty"`
	UnreadCount int `json:"unreadCount"`
}

// ChatMessage is the message shape expected by the frontend.
type ChatMessage struct {
	ID             string `json:"id"`
	ConversationID string `json:"conversationId"`
	SenderID       string `json:"senderId"`
	Content        string `json:"content"`
	CreatedAt      string `json:"createdAt"`
	Seq            int64  `json:"seq"`
	Sender         struct {
		FirstName string  `json:"firstName"`
		LastName  string  `json:"lastName"`
		AvatarURL *string `json:"avatarUrl,omitempty"`
	} `json:"sender"`
}

// PrivateConversationRow mirrors private_conversations table.
type PrivateConversationRow struct {
	ID        string
	User1ID   string
	User2ID   string
	CreatedAt time.Time
	UpdatedAt time.Time
}