package ws

// IncomingMessage is received from client over websocket.
type IncomingMessage struct {
	Type           string `json:"type"` // "chat_message", "typing"
	ConversationID string `json:"conversationId"`
	Content        string `json:"content"`
}

// OutgoingMessage is sent to clients.
type OutgoingMessage struct {
	Type    string      `json:"type"` // "chat_message", "typing"
	Payload interface{} `json:"payload"`
}
