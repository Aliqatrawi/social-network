package chat

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"
)

type Handler struct {
	db      *sql.DB
	service *Service
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{
		db:      db,
		service: NewService(db),
	}
}

func (h *Handler) GetConversations(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	convs, err := h.service.Repo().ListConversations(user.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load conversations")
		return
	}

	// Also show users the current user is allowed to chat with, even if there are no messages yet.
	eligibleIDs, err := h.service.Repo().ListEligiblePrivateUserIDs(user.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load conversations")
		return
	}

	// Track which private participants already exist in the list.
	existing := map[string]bool{}
	for _, c := range convs {
		if c.Type == "private" && c.Participant != nil {
			existing[c.Participant.UserID] = true
		}
	}

	for _, otherID := range eligibleIDs {
		if otherID == "" || otherID == user.ID {
			continue
		}
		if existing[otherID] {
			continue
		}

		row, err := h.service.Repo().EnsurePrivateConversation(user.ID, otherID)
		if err != nil {
			continue
		}
		fn, ln, av, err := h.service.Repo().GetUserBasic(otherID)
		if err != nil {
			continue
		}
		conv := models.Conversation{
			ID:   row.ID,
			Type: "private",
			Participant: &struct {
				UserID    string  `json:"userId"`
				FirstName string  `json:"firstName"`
				LastName  string  `json:"lastName"`
				AvatarURL *string `json:"avatarUrl,omitempty"`
			}{
				UserID:    otherID,
				FirstName: fn,
				LastName:  ln,
				AvatarURL: av,
			},
			UnreadCount: 0,
		}
		convs = append(convs, conv)
		existing[otherID] = true
	}

	utils.JSONResponse(w, http.StatusOK, convs)
}

func (h *Handler) GetConversationMessages(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	conversationID := r.PathValue("conversationId")
	limit, offset := parsePagination(r)

	// Group conversation
	if strings.HasPrefix(conversationID, "group:") {
		groupID := strings.TrimPrefix(conversationID, "group:")
		ok, err := h.service.IsGroupMember(user.ID, groupID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
			return
		}
		if !ok {
			utils.ErrorResponse(w, http.StatusForbidden, "Not allowed")
			return
		}

		msgs, err := h.service.Repo().GetGroupMessages(groupID, limit, offset)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load messages")
			return
		}
		utils.JSONResponse(w, http.StatusOK, msgs)
		return
	}

	// Private conversation
	u1, u2, err := h.service.Repo().GetConversationParticipants(conversationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Conversation not found")
		return
	}
	other := u1
	if other == user.ID {
		other = u2
	}

	ok, err := h.service.CanAccessPrivateConversation(user.ID, other, conversationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	if !ok {
		utils.ErrorResponse(w, http.StatusForbidden, "Not allowed")
		return
	}

	msgs, err := h.service.Repo().GetPrivateMessages(conversationID, limit, offset)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to load messages")
		return
	}
	utils.JSONResponse(w, http.StatusOK, msgs)
}

func (h *Handler) SendMessage(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var payload SendMessagePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}
	payload.Content = strings.TrimSpace(payload.Content)
	if payload.Content == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Message content is required")
		return
	}
	if len([]rune(payload.Content)) > 3000 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Message must be 3000 characters or less")
		return
	}

	// Group message
	if strings.HasPrefix(payload.ConversationID, "group:") {
		groupID := strings.TrimPrefix(payload.ConversationID, "group:")
		ok, err := h.service.IsGroupMember(user.ID, groupID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
			return
		}
		if !ok {
			utils.ErrorResponse(w, http.StatusForbidden, "Not allowed")
			return
		}
		id, createdAt, seq, err := h.service.Repo().InsertGroupMessage(groupID, user.ID, payload.Content)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to send message")
			return
		}
		fn, ln, av, _ := h.service.Repo().GetUserBasic(user.ID)
		resp := map[string]any{
			"id":             id,
			"conversationId": "group:" + groupID,
			"senderId":       user.ID,
			"content":        payload.Content,
			"createdAt":      createdAt,
			"seq":            seq,
			"sender": map[string]any{
				"firstName": fn,
				"lastName":  ln,
				"avatarUrl": av,
			},
		}
		utils.JSONResponse(w, http.StatusOK, resp)
		return
	}

	// Private message
	u1, u2, err := h.service.Repo().GetConversationParticipants(payload.ConversationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "Conversation not found")
		return
	}
	other := u1
	if other == user.ID {
		other = u2
	}
	ok, err := h.service.CanPrivateChat(user.ID, other)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	if !ok {
		utils.ErrorResponse(w, http.StatusForbidden, "Not allowed")
		return
	}

	id, createdAt, seq, err := h.service.Repo().InsertPrivateMessage(payload.ConversationID, user.ID, other, payload.Content)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to send message")
		return
	}
	h.service.Repo().TouchConversation(payload.ConversationID)

	fn, ln, av, _ := h.service.Repo().GetUserBasic(user.ID)
	resp := map[string]any{
		"id":             id,
		"conversationId": payload.ConversationID,
		"senderId":       user.ID,
		"content":        payload.Content,
		"createdAt":      createdAt,
		"seq":            seq,
		"sender": map[string]any{
			"firstName": fn,
			"lastName":  ln,
			"avatarUrl": av,
		},
	}
	utils.JSONResponse(w, http.StatusOK, resp)
}

func (h *Handler) GetOrCreatePrivateConversation(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}
	otherID := r.PathValue("userId")
	if otherID == "" || otherID == user.ID {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid user")
		return
	}

	ok, err := h.service.CanPrivateChat(user.ID, otherID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	if !ok {
		utils.ErrorResponse(w, http.StatusForbidden, "Not allowed")
		return
	}

	row, err := h.service.Repo().EnsurePrivateConversation(user.ID, otherID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create conversation")
		return
	}

	// Build response shape expected by frontend
	fn, ln, av, err := h.service.Repo().GetUserBasic(otherID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}

	resp := map[string]any{
		"id":   row.ID,
		"type": "private",
		"participant": map[string]any{
			"userId":    otherID,
			"firstName": fn,
			"lastName":  ln,
			"avatarUrl": av,
		},
		"unreadCount": 0,
	}
	utils.JSONResponse(w, http.StatusOK, resp)
}

func (h *Handler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}
	count, err := h.service.Repo().CountUnreadMessages(user.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]int{"count": count})
}

func (h *Handler) MarkConversationRead(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}
	conversationID := r.PathValue("conversationId")
	if conversationID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Missing conversationId")
		return
	}
	if strings.HasPrefix(conversationID, "group:") {
		groupID := strings.TrimPrefix(conversationID, "group:")
		if err := h.service.Repo().MarkGroupConversationRead(groupID, user.ID); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
			return
		}
	} else {
		if err := h.service.Repo().MarkConversationRead(conversationID, user.ID); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
			return
		}
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "ok"})
}

func parsePagination(r *http.Request) (limit int, offset int) {
	q := r.URL.Query()
	limit = 30
	offset = 0

	if s := q.Get("limit"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	if s := q.Get("offset"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v >= 0 {
			offset = v
		}
	}

	return
}