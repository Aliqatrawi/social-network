package ws

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"social-network/backend/pkg/chat"
	"social-network/backend/pkg/utils"

	"github.com/gorilla/websocket"
)

type Handler struct {
	db        *sql.DB
	hub       *Hub
	throttler *Throttler
	chat      *chat.Service
	upgrader  websocket.Upgrader
}

func NewHandler(db *sql.DB, hub *Hub, throttler *Throttler) *Handler {
	return &Handler{
		db:        db,
		hub:       hub,
		throttler: throttler,
		chat:      chat.NewService(db),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}
				// Allow localhost origins for development
				if strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "https://localhost") {
					return true
				}
				// Allow same-host origins
				if strings.Contains(origin, r.Host) {
					return true
				}
				return false
			},
		},
	}
}

func (h *Handler) ServeWS(w http.ResponseWriter, r *http.Request) {
	userID, err := AuthenticateFromCookie(h.db, r)
	if err != nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	gc := NewGorillaClient(conn)
	h.hub.AddClient(userID, gc.Client)

	// Auto-join group rooms the user belongs to
	h.joinUserGroups(userID, gc.Client)

	// Start writer
	go gc.WritePump()

	// Reader loop
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var in IncomingMessage
		if err := json.Unmarshal(data, &in); err != nil {
			continue
		}
		if in.ConversationID == "" {
			continue
		}

		if in.Type == "typing" {
			h.handleTyping(userID, in)
			continue
		}

		if in.Type != "chat_message" {
			continue
		}
		in.Content = strings.TrimSpace(in.Content)
		if in.Content == "" {
			continue
		}

		if h.throttler != nil && !h.throttler.Allow(userID) {
			gc.Send(OutgoingMessage{
				Type: "error",
				Payload: map[string]any{
					"message": "Too many messages, slow down",
				},
			})
			continue
		}

		h.handleChatMessage(userID, in, gc)
	}

	h.hub.RemoveClient(userID, gc.Client)
	gc.Close()
}

func (h *Handler) handleChatMessage(userID string, in IncomingMessage, sender *GorillaClient) {
	repo := h.chat.Repo()
	log.Printf("[handleChatMessage] Received message from user %s for conversation %s: %s\n", userID, in.ConversationID, in.Content)

	// Group conversation
	if strings.HasPrefix(in.ConversationID, "group:") {
		groupID := strings.TrimPrefix(in.ConversationID, "group:")
		ok, err := h.chat.IsGroupMember(userID, groupID)
		if err != nil || !ok {
			log.Printf("[handleChatMessage] User %s is not member of group %s\n", userID, groupID)
			return
		}

		id, createdAt, seq, err := repo.InsertGroupMessage(groupID, userID, in.Content)
		if err != nil {
			log.Printf("[handleChatMessage] Failed to insert group message: %v\n", err)
			return
		}
		fn, ln, av, _ := repo.GetUserBasic(userID)

		payload := map[string]any{
			"id":             id,
			"conversationId": "group:" + groupID,
			"senderId":       userID,
			"content":        in.Content,
			"createdAt":      createdAt,
			"seq":            seq,
			"sender": map[string]any{
				"firstName": fn,
				"lastName":  ln,
				"avatarUrl": av,
			},
		}

		msg := OutgoingMessage{Type: "chat_message", Payload: payload}
		log.Printf("[handleChatMessage] Broadcasting to group %s: %v\n", groupID, msg)
		// Use room-based broadcast so only clients in this group room receive the message
		h.hub.BroadcastRoom("group:"+groupID, msg)
		return
	}

	// Private conversation
	u1, u2, err := repo.GetConversationParticipants(in.ConversationID)
	if err != nil {
		log.Printf("[handleChatMessage] Failed to get conversation participants: %v\n", err)
		return
	}
	other := u1
	if other == userID {
		other = u2
	}

	ok, err := h.chat.CanPrivateChat(userID, other)
	if err != nil || !ok {
		log.Printf("[handleChatMessage] Cannot chat: user %s cannot message %s\n", userID, other)
		return
	}

	id, createdAt, seq, err := repo.InsertPrivateMessage(in.ConversationID, userID, other, in.Content)
	if err != nil {
		log.Printf("[handleChatMessage] Failed to insert private message: %v\n", err)
		return
	}
	repo.TouchConversation(in.ConversationID)

	fn, ln, av, _ := repo.GetUserBasic(userID)
	payload := map[string]any{
		"id":             id,
		"conversationId": in.ConversationID,
		"senderId":       userID,
		"content":        in.Content,
		"createdAt":      createdAt,
		"seq":            seq,
		"sender": map[string]any{
			"firstName": fn,
			"lastName":  ln,
			"avatarUrl": av,
		},
	}

	msg := OutgoingMessage{Type: "chat_message", Payload: payload}
	log.Printf("[handleChatMessage] Sending to user %s (other: %s): %v\n", other, userID, msg)
	h.hub.SendToUser(other, msg)
	log.Printf("[handleChatMessage] Sending to user %s (sender): %v\n", userID, msg)
	h.hub.SendToUser(userID, msg)
	log.Printf("[handleChatMessage] Message sent successfully\n")
}

func (h *Handler) handleTyping(userID string, in IncomingMessage) {
	repo := h.chat.Repo()
	fn, ln, _, _ := repo.GetUserBasic(userID)
	log.Printf("[handleTyping] User %s typing in conversation %s\n", userID, in.ConversationID)

	msg := OutgoingMessage{
		Type: "typing",
		Payload: map[string]any{
			"conversationId": in.ConversationID,
			"userId":         userID,
			"userName":       fn + " " + ln,
		},
	}

	if strings.HasPrefix(in.ConversationID, "group:") {
		groupID := strings.TrimPrefix(in.ConversationID, "group:")
		ok, err := h.chat.IsGroupMember(userID, groupID)
		if err != nil || !ok {
			return
		}

		memberIDs, err := repo.ListGroupMemberIDs(groupID)
		if err != nil {
			return
		}
		for _, memberID := range memberIDs {
			if memberID == userID {
				continue
			}
			log.Printf("[handleTyping] Sending typing to group member %s\n", memberID)
			h.hub.SendToUser(memberID, msg)
		}
		return
	}

	u1, u2, err := repo.GetConversationParticipants(in.ConversationID)
	if err != nil {
		return
	}
	other := u1
	if other == userID {
		other = u2
	}
	ok, err := h.chat.CanPrivateChat(userID, other)
	if err != nil || !ok {
		return
	}
	log.Printf("[handleTyping] Sending typing to user %s\n", other)
	h.hub.SendToUser(other, msg)
}

func (h *Handler) joinUserGroups(userID string, c *Client) {
	rows, err := h.db.Query(`SELECT group_id FROM group_members WHERE user_id = ?`, userID)
	if err != nil {
		log.Println("ws join groups error:", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var gid string
		if err := rows.Scan(&gid); err == nil {
			h.hub.JoinRoom("group:"+gid, c)
		}
	}
	_ = time.Now()
}
