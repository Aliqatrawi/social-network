package chat

// SendMessagePayload is the POST /api/chat/messages request body.
type SendMessagePayload struct {
	ConversationID string `json:"conversationId"`
	Content        string `json:"content"`
}

// PaginationQuery supports scroll-up loading (older messages).
type PaginationQuery struct {
	Limit  int
	Before string // ISO timestamp string
}
