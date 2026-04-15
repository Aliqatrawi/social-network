package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"
)

// EventHandler handles event-related routes
type EventHandler struct {
	db *sql.DB
}

// NewEventHandler creates a new event handler
func NewEventHandler(db *sql.DB) *EventHandler {
	return &EventHandler{db: db}
}

// CreateEvent creates a new event in a group
func (h *EventHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	groupID := r.PathValue("groupId")
	if groupID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	var req models.EventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title == "" || req.Description == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Title and description are required")
		return
	}

	// Validate options: min 2, max 4
	if len(req.Options) < 2 {
		utils.ErrorResponse(w, http.StatusBadRequest, "At least 2 response options are required")
		return
	}
	if len(req.Options) > 4 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Maximum 4 response options allowed")
		return
	}
	for _, opt := range req.Options {
		if strings.TrimSpace(opt) == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "Option labels cannot be empty")
			return
		}
	}

	// Check if user is member of group
	var count int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID).Scan(&count); err != nil {
		log.Printf("Failed to check membership for group %s: %v", groupID, err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create event")
		return
	}
	if count == 0 {
		utils.ErrorResponse(w, http.StatusForbidden, "You are not a member of this group")
		return
	}

	eventID := uuid.New().String()

	tx, err := h.db.Begin()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create event")
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO events (id, group_id, title, description, date_time, created_by_id)
		VALUES (?, ?, ?, ?, ?, ?)
	`, eventID, groupID, req.Title, req.Description, req.DateTime, user.ID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create event")
		return
	}

	// Insert event options
	var options []models.EventOptionCount
	for i, label := range req.Options {
		optID := uuid.New().String()
		label = strings.TrimSpace(label)
		_, err := tx.Exec(`INSERT INTO event_options (id, event_id, label, position) VALUES (?, ?, ?, ?)`,
			optID, eventID, label, i)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create event options")
			return
		}
		options = append(options, models.EventOptionCount{ID: optID, Label: label, Count: 0})
	}

	if err := tx.Commit(); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create event")
		return
	}

	// Get group name
	var groupName string
	if err := h.db.QueryRow(`SELECT name FROM groups WHERE id = ?`, groupID).Scan(&groupName); err != nil {
		log.Printf("Failed to fetch group name for group %s: %v", groupID, err)
	}

	// Collect all group member IDs first (close rows before inserting notifications
	// to avoid SQLite busy/locked errors from concurrent read+write on same connection)
	var memberIDs []string
	memberRows, err := h.db.Query(`
		SELECT user_id FROM group_members
		WHERE group_id = ? AND user_id != ?
	`, groupID, user.ID)
	if err != nil {
		log.Printf("Failed to query group members for event notification, group %s: %v", groupID, err)
	} else {
		for memberRows.Next() {
			var memberID string
			if err := memberRows.Scan(&memberID); err != nil {
				log.Printf("Failed to scan member ID for event notification: %v", err)
				continue
			}
			memberIDs = append(memberIDs, memberID)
		}
		memberRows.Close()
	}

	// Now send notifications with the rows cursor closed
	notificationHandler := NewNotificationHandler(h.db)
	for _, memberID := range memberIDs {
		if err := notificationHandler.CreateNotification(
			memberID,
			models.NotificationGroupEvent,
			"New group event",
			"New event "+req.Title+" created in "+groupName+" by "+user.FirstName+" "+user.LastName,
			user.ID,
			groupID,
			eventID,
		); err != nil {
			log.Printf("Failed to create event notification for user %s: %v", memberID, err)
		}
	}

	now := time.Now()
	createdByResp := user.ToResponse()
	event := models.EventResponse{
		ID:          eventID,
		GroupID:     groupID,
		Title:       req.Title,
		Description: req.Description,
		DateTime:    req.DateTime,
		CreatedBy:   &createdByResp,
		Options:     options,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	utils.JSONResponse(w, http.StatusCreated, event)
}

// GetGroupEvents retrieves events for a group
func (h *EventHandler) GetGroupEvents(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	groupID := r.PathValue("groupId")
	if groupID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	// Check if user is member of group
	var count int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID).Scan(&count); err != nil {
		log.Printf("Failed to check membership for group %s: %v", groupID, err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch events")
		return
	}
	if count == 0 {
		utils.ErrorResponse(w, http.StatusForbidden, "You are not a member of this group")
		return
	}

	// Get pagination parameters
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 10
	offset := 0

	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	rows, err := h.db.Query(`
		SELECT id, group_id, title, description, date_time, created_by_id, created_at, updated_at
		FROM events
		WHERE group_id = ?
		ORDER BY date_time DESC
		LIMIT ? OFFSET ?
	`, groupID, limit, offset)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch events")
		return
	}
	defer rows.Close()

	var events []models.EventResponse
	for rows.Next() {
		var event models.EventResponse
		var createdByID string

		if err := rows.Scan(&event.ID, &event.GroupID, &event.Title, &event.Description,
			&event.DateTime, &createdByID, &event.CreatedAt, &event.UpdatedAt); err != nil {
			continue
		}

		// Get creator info
		var creator models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, createdByID).Scan(
			&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName,
			&creator.DateOfBirth, &creator.Username, &creator.Nickname, &creator.AboutMe,
			&creator.AvatarURL, &creator.BannerURL, &creator.IsPublic,
			&creator.CreatedAt, &creator.UpdatedAt); err != nil {
			log.Printf("Failed to fetch creator info for event %s: %v", event.ID, err)
			continue
		}

		creatorResp := creator.ToResponse()
		event.CreatedBy = &creatorResp

		// Load event options with counts
		event.Options = h.loadEventOptions(event.ID)

		// Legacy going/not_going counts for backward compat
		for _, opt := range event.Options {
			lower := strings.ToLower(opt.Label)
			if lower == "going" {
				event.GoingCount = opt.Count
			} else if lower == "not going" || lower == "not_going" {
				event.NotGoingCount = opt.Count
			}
		}

		// Get current user's response (option ID)
		var userResponse string
		err := h.db.QueryRow(`SELECT response FROM event_responses WHERE event_id = ? AND user_id = ?`, event.ID, user.ID).Scan(&userResponse)
		if err == nil {
			event.UserResponse = userResponse
		}

		events = append(events, event)
	}

	if events == nil {
		events = []models.EventResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"events": events,
		"limit":  limit,
		"offset": offset,
	})
}

// RSVPEvent allows a user to RSVP to an event
func (h *EventHandler) RSVPEvent(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	eventID := r.PathValue("eventId")
	if eventID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Event ID is required")
		return
	}

	var req models.EventRSVPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate response is a valid option ID for this event
	var optionExists int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM event_options WHERE id = ? AND event_id = ?`, req.Response, eventID).Scan(&optionExists); err != nil || optionExists == 0 {
		// Fallback: check legacy "going"/"not_going" values
		if req.Response != "going" && req.Response != "not_going" {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid response option")
			return
		}
	}

	// Get event and check if user is member of group
	var groupID string
	var eventDateTime time.Time
	err := h.db.QueryRow(`SELECT group_id, date_time FROM events WHERE id = ?`, eventID).Scan(&groupID, &eventDateTime)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Event not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to RSVP to event")
		}
		return
	}

	// Check if event has ended
	if time.Now().After(eventDateTime) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Cannot respond to an event that has ended")
		return
	}

	// Check if user is member of group
	var count int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID).Scan(&count); err != nil {
		log.Printf("Failed to check membership for group %s: %v", groupID, err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to RSVP to event")
		return
	}
	if count == 0 {
		utils.ErrorResponse(w, http.StatusForbidden, "You are not a member of this group")
		return
	}

	// Check if already responded
	var existingResponse string
	err = h.db.QueryRow(`SELECT response FROM event_responses WHERE event_id = ? AND user_id = ?`, eventID, user.ID).Scan(&existingResponse)

	if err == sql.ErrNoRows {
		// Create new response
		rsvpID := uuid.New().String()
		_, err := h.db.Exec(`
			INSERT INTO event_responses (id, event_id, user_id, response)
			VALUES (?, ?, ?, ?)
		`, rsvpID, eventID, user.ID, req.Response)

		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to RSVP to event")
			return
		}
	} else if err == nil {
		// Update existing response
		_, err := h.db.Exec(`UPDATE event_responses SET response = ? WHERE event_id = ? AND user_id = ?`, req.Response, eventID, user.ID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to RSVP to event")
			return
		}
	} else {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to RSVP to event")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{
		"message":  "RSVP recorded",
		"response": req.Response,
	})
}

// GetEventRespondents returns users who responded to an event, grouped by response
func (h *EventHandler) GetEventRespondents(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	eventID := r.PathValue("eventId")
	if eventID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Event ID is required")
		return
	}

	// Get group_id for this event and verify membership
	var groupID string
	err := h.db.QueryRow(`SELECT group_id FROM events WHERE id = ?`, eventID).Scan(&groupID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Event not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch respondents")
		}
		return
	}

	var count int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID).Scan(&count); err != nil || count == 0 {
		utils.ErrorResponse(w, http.StatusForbidden, "You are not a member of this group")
		return
	}

	type Respondent struct {
		ID        string `json:"id"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Username  string `json:"username"`
		AvatarURL string `json:"avatarUrl,omitempty"`
	}

	// Load options for this event
	options := h.loadEventOptions(eventID)

	// Build respondents grouped by option
	optionRespondents := make(map[string][]Respondent)
	for _, opt := range options {
		optionRespondents[opt.ID] = []Respondent{}
	}

	rows, err := h.db.Query(`
		SELECT er.response, u.id, u.first_name, u.last_name, u.username, COALESCE(u.avatar_url, '')
		FROM event_responses er
		JOIN users u ON u.id = er.user_id
		WHERE er.event_id = ?
		ORDER BY u.first_name
	`, eventID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch respondents")
		return
	}
	defer rows.Close()

	going := []Respondent{}
	notGoing := []Respondent{}

	for rows.Next() {
		var response, avatarURL string
		var resp Respondent
		if err := rows.Scan(&response, &resp.ID, &resp.FirstName, &resp.LastName, &resp.Username, &avatarURL); err != nil {
			continue
		}
		if avatarURL != "" {
			resp.AvatarURL = avatarURL
		}
		// Group by option ID
		if _, ok := optionRespondents[response]; ok {
			optionRespondents[response] = append(optionRespondents[response], resp)
		}
		// Legacy compat
		if response == "going" {
			going = append(going, resp)
		} else if response == "not_going" {
			notGoing = append(notGoing, resp)
		}
	}

	type OptionWithRespondents struct {
		ID          string       `json:"id"`
		Label       string       `json:"label"`
		Respondents []Respondent `json:"respondents"`
	}

	var optionsResult []OptionWithRespondents
	for _, opt := range options {
		optionsResult = append(optionsResult, OptionWithRespondents{
			ID:          opt.ID,
			Label:       opt.Label,
			Respondents: optionRespondents[opt.ID],
		})
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"going":    going,
		"notGoing": notGoing,
		"options":  optionsResult,
	})
}

// loadEventOptions loads options for an event with response counts
func (h *EventHandler) loadEventOptions(eventID string) []models.EventOptionCount {
	rows, err := h.db.Query(`
		SELECT eo.id, eo.label,
			(SELECT COUNT(*) FROM event_responses er WHERE er.event_id = eo.event_id AND er.response = eo.id) as cnt
		FROM event_options eo
		WHERE eo.event_id = ?
		ORDER BY eo.position
	`, eventID)
	if err != nil {
		return []models.EventOptionCount{}
	}
	defer rows.Close()

	var options []models.EventOptionCount
	for rows.Next() {
		var opt models.EventOptionCount
		if err := rows.Scan(&opt.ID, &opt.Label, &opt.Count); err != nil {
			continue
		}
		options = append(options, opt)
	}
	if options == nil {
		options = []models.EventOptionCount{}
	}
	return options
}
