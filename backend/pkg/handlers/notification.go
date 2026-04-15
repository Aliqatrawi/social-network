package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/google/uuid"

	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"
	"social-network/backend/pkg/ws"
)

// NotificationHandler handles notification-related routes
type NotificationHandler struct {
	db *sql.DB
}

var (
	notificationHubMu sync.RWMutex
	notificationHub   *ws.Hub
)

func SetNotificationHub(hub *ws.Hub) {
	notificationHubMu.Lock()
	defer notificationHubMu.Unlock()
	notificationHub = hub
}

func getNotificationHub() *ws.Hub {
	notificationHubMu.RLock()
	defer notificationHubMu.RUnlock()
	return notificationHub
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(db *sql.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

// GetNotifications retrieves all notifications for the current user
func (h *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	// Get pagination parameters
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	offset := 0

	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	rows, err := h.db.Query(`
		SELECT
			id, user_id, type, title, message, related_user_id, group_id,
			group_name, event_id, event_title, post_id, post_title, is_read, created_at, updated_at
		FROM notifications
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, user.ID, limit, offset)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch notifications")
		return
	}
	defer rows.Close()

	notifications := []models.NotificationResponse{}
	for rows.Next() {
		var notif models.NotificationResponse
		var relatedUserID, groupID, eventID, postID sql.NullString
		var groupName, eventTitle, postTitle sql.NullString
		var title, message string
		var isRead bool
		var updatedAt interface{}

		if err := rows.Scan(
			&notif.ID, &notif.UserID, &notif.Type, &title, &message,
			&relatedUserID, &groupID, &groupName, &eventID, &eventTitle,
			&postID, &postTitle, &isRead,
			&notif.CreatedAt, &updatedAt); err != nil {
			log.Printf("Failed to scan notification row: %v", err)
			continue
		}

		notif.IsRead = isRead

		if relatedUserID.Valid {
			notif.ActorID = relatedUserID.String

			// Get actor user info
			var actorUser models.User
			if err := h.db.QueryRow(`
				SELECT id, email, first_name, last_name, date_of_birth,
					   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
				FROM users WHERE id = ?
			`, relatedUserID.String).Scan(
				&actorUser.ID, &actorUser.Email, &actorUser.FirstName, &actorUser.LastName,
				&actorUser.DateOfBirth, &actorUser.Username, &actorUser.Nickname, &actorUser.AboutMe,
				&actorUser.AvatarURL, &actorUser.BannerURL, &actorUser.IsPublic,
				&actorUser.CreatedAt, &actorUser.UpdatedAt); err != nil {
				log.Printf("Failed to fetch actor user info for notification %s: %v", notif.ID, err)
			} else {
				actorResp := actorUser.ToResponse()
				notif.Actor = &actorResp
			}
		}

		// Check if the action is still pending
		if notif.Type == models.NotificationFollowRequest && relatedUserID.Valid {
			var status string
			err := h.db.QueryRow(`
				SELECT status FROM followers
				WHERE follower_id = ? AND following_id = ? AND status = 'pending'
			`, relatedUserID.String, notif.UserID).Scan(&status)
			notif.ActionPending = err == nil && status == "pending"
		} else if notif.Type == models.NotificationGroupInvitation && groupID.Valid && relatedUserID.Valid {
			var pendingStatus string
			err := h.db.QueryRow(`
				SELECT status FROM group_invitations
				WHERE group_id = ? AND user_id = ? AND invited_by_id != user_id AND status = 'pending'
			`, groupID.String, notif.UserID).Scan(&pendingStatus)
			notif.ActionPending = err == nil && pendingStatus == "pending"
		} else if notif.Type == models.NotificationGroupJoinRequest && groupID.Valid && relatedUserID.Valid {
			var pendingStatus string
			err := h.db.QueryRow(`
				SELECT status FROM group_invitations
				WHERE group_id = ? AND user_id = ? AND invited_by_id = user_id AND status = 'pending'
			`, groupID.String, relatedUserID.String).Scan(&pendingStatus)
			notif.ActionPending = err == nil && pendingStatus == "pending"
		}

		// Build metadata if any related IDs exist
		meta := models.NotificationMetadata{}
		hasMeta := false
		if groupID.Valid {
			meta.GroupID = groupID.String
			hasMeta = true
		}
		if groupName.Valid {
			meta.GroupName = groupName.String
		}
		if eventID.Valid {
			meta.EventID = eventID.String
			hasMeta = true
		}
		if eventTitle.Valid {
			meta.EventTitle = eventTitle.String
		}
		if postID.Valid {
			meta.PostID = postID.String
			hasMeta = true
		}
		if postTitle.Valid {
			meta.PostTitle = postTitle.String
		}
		if hasMeta {
			notif.Metadata = &meta
		}

		notifications = append(notifications, notif)
	}

	utils.JSONResponse(w, http.StatusOK, notifications)
}

func (h *NotificationHandler) loadNotificationResponse(notificationID string) (*models.NotificationResponse, error) {
	row := h.db.QueryRow(`
		SELECT
			id, user_id, type, title, message, related_user_id, group_id,
			group_name, event_id, event_title, post_id, post_title, is_read, created_at, updated_at
		FROM notifications
		WHERE id = ?
	`, notificationID)

	var notif models.NotificationResponse
	var relatedUserID, groupID, eventID, postID sql.NullString
	var groupName, eventTitle, postTitle sql.NullString
	var title, message string
	var isRead bool
	var updatedAt interface{}

	if err := row.Scan(
		&notif.ID, &notif.UserID, &notif.Type, &title, &message,
		&relatedUserID, &groupID, &groupName, &eventID, &eventTitle,
		&postID, &postTitle, &isRead,
		&notif.CreatedAt, &updatedAt,
	); err != nil {
		return nil, err
	}

	notif.IsRead = isRead

	if relatedUserID.Valid {
		notif.ActorID = relatedUserID.String

		var actorUser models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, relatedUserID.String).Scan(
			&actorUser.ID, &actorUser.Email, &actorUser.FirstName, &actorUser.LastName,
			&actorUser.DateOfBirth, &actorUser.Username, &actorUser.Nickname, &actorUser.AboutMe,
			&actorUser.AvatarURL, &actorUser.BannerURL, &actorUser.IsPublic,
			&actorUser.CreatedAt, &actorUser.UpdatedAt,
		); err != nil {
			log.Printf("Failed to fetch actor user info for notification %s: %v", notif.ID, err)
		} else {
			actorResp := actorUser.ToResponse()
			notif.Actor = &actorResp
		}
	}

	if notif.Type == models.NotificationFollowRequest && relatedUserID.Valid {
		var status string
		err := h.db.QueryRow(`
			SELECT status FROM followers
			WHERE follower_id = ? AND following_id = ? AND status = 'pending'
		`, relatedUserID.String, notif.UserID).Scan(&status)
		notif.ActionPending = err == nil && status == "pending"
	} else if notif.Type == models.NotificationGroupInvitation && groupID.Valid && relatedUserID.Valid {
		var pendingStatus string
		err := h.db.QueryRow(`
			SELECT status FROM group_invitations
			WHERE group_id = ? AND user_id = ? AND invited_by_id != user_id AND status = 'pending'
		`, groupID.String, notif.UserID).Scan(&pendingStatus)
		notif.ActionPending = err == nil && pendingStatus == "pending"
	} else if notif.Type == models.NotificationGroupJoinRequest && groupID.Valid && relatedUserID.Valid {
		var pendingStatus string
		err := h.db.QueryRow(`
			SELECT status FROM group_invitations
			WHERE group_id = ? AND user_id = ? AND invited_by_id = user_id AND status = 'pending'
		`, groupID.String, relatedUserID.String).Scan(&pendingStatus)
		notif.ActionPending = err == nil && pendingStatus == "pending"
	}

	meta := models.NotificationMetadata{}
	hasMeta := false
	if groupID.Valid {
		meta.GroupID = groupID.String
		hasMeta = true
	}
	if groupName.Valid {
		meta.GroupName = groupName.String
	}
	if eventID.Valid {
		meta.EventID = eventID.String
		hasMeta = true
	}
	if eventTitle.Valid {
		meta.EventTitle = eventTitle.String
	}
	if postID.Valid {
		meta.PostID = postID.String
		hasMeta = true
	}
	if postTitle.Valid {
		meta.PostTitle = postTitle.String
	}
	if hasMeta {
		notif.Metadata = &meta
	}

	return &notif, nil
}

func (h *NotificationHandler) pushRealtimeNotification(userID, notificationID string) {
	hub := getNotificationHub()
	if hub == nil {
		return
	}

	notif, err := h.loadNotificationResponse(notificationID)
	if err != nil {
		log.Printf("Failed to load notification %s for realtime push: %v", notificationID, err)
		return
	}

	var unreadCount int
	if err := h.db.QueryRow(`
		SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0
	`, userID).Scan(&unreadCount); err != nil {
		log.Printf("Failed to fetch unread notification count for realtime push, user %s: %v", userID, err)
		return
	}

	hub.SendToUser(userID, ws.OutgoingMessage{
		Type: "notification",
		Payload: map[string]any{
			"notification": notif,
			"unreadCount":  unreadCount,
		},
	})
}

// MarkNotificationAsRead marks a notification as read
func (h *NotificationHandler) MarkNotificationAsRead(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	notificationID := r.PathValue("notificationId")
	if notificationID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Notification ID is required")
		return
	}

	// Check if notification belongs to the user
	var userID string
	err := h.db.QueryRow(`SELECT user_id FROM notifications WHERE id = ?`, notificationID).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Notification not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update notification")
		}
		return
	}

	if userID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "You can only update your own notifications")
		return
	}

	// Mark as read
	_, err = h.db.Exec(`UPDATE notifications SET is_read = 1 WHERE id = ?`, notificationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update notification")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Notification updated"})
}

// MarkAllNotificationsAsRead marks all notifications as read
func (h *NotificationHandler) MarkAllNotificationsAsRead(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	_, err := h.db.Exec(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, user.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update notifications")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "All notifications marked as read"})
}

// DeleteNotification deletes a notification
func (h *NotificationHandler) DeleteNotification(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	notificationID := r.PathValue("notificationId")
	if notificationID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Notification ID is required")
		return
	}

	// Check if notification belongs to the user
	var userID string
	err := h.db.QueryRow(`SELECT user_id FROM notifications WHERE id = ?`, notificationID).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Notification not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete notification")
		}
		return
	}

	if userID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "You can only delete your own notifications")
		return
	}

	_, err = h.db.Exec(`DELETE FROM notifications WHERE id = ?`, notificationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete notification")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Notification deleted"})
}

// Helper function to create a notification
func (h *NotificationHandler) CreateNotification(userID string, notifType models.NotificationType, title, message string, relatedUserID, groupID, eventID string, extraIDs ...string) error {
	notifID := uuid.New().String()

	relatedUserIDNull := sql.NullString{}
	if relatedUserID != "" {
		relatedUserIDNull.String = relatedUserID
		relatedUserIDNull.Valid = true
	}

	groupIDNull := sql.NullString{}
	groupNameNull := sql.NullString{}
	if groupID != "" {
		groupIDNull.String = groupID
		groupIDNull.Valid = true

		// Get group name
		var groupName string
		if err := h.db.QueryRow(`SELECT name FROM groups WHERE id = ?`, groupID).Scan(&groupName); err != nil {
			log.Printf("Failed to fetch group name for notification, group %s: %v", groupID, err)
		}
		groupNameNull.String = groupName
		groupNameNull.Valid = true
	}

	eventIDNull := sql.NullString{}
	eventTitleNull := sql.NullString{}
	if eventID != "" {
		eventIDNull.String = eventID
		eventIDNull.Valid = true

		// Get event title
		var eventTitle string
		if err := h.db.QueryRow(`SELECT title FROM events WHERE id = ?`, eventID).Scan(&eventTitle); err != nil {
			log.Printf("Failed to fetch event title for notification, event %s: %v", eventID, err)
		}
		eventTitleNull.String = eventTitle
		eventTitleNull.Valid = true
	}

	// Optional postID passed as first extra arg
	postIDNull := sql.NullString{}
	postTitleNull := sql.NullString{}
	if len(extraIDs) > 0 && extraIDs[0] != "" {
		postIDNull.String = extraIDs[0]
		postIDNull.Valid = true

		// Get post title
		var postTitle string
		if err := h.db.QueryRow(`SELECT title FROM posts WHERE id = ?`, extraIDs[0]).Scan(&postTitle); err != nil {
			log.Printf("Failed to fetch post title for notification, post %s: %v", extraIDs[0], err)
		}
		if postTitle != "" {
			postTitleNull.String = postTitle
			postTitleNull.Valid = true
		}
	}

	_, err := h.db.Exec(`
		INSERT INTO notifications (id, user_id, type, title, message, related_user_id, group_id, group_name, event_id, event_title, post_id, post_title)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, notifID, userID, notifType, title, message, relatedUserIDNull, groupIDNull, groupNameNull, eventIDNull, eventTitleNull, postIDNull, postTitleNull)
	if err != nil {
		return err
	}

	h.pushRealtimeNotification(userID, notifID)
	return nil
}

// GetUnreadNotificationCount returns the count of unread notifications
func (h *NotificationHandler) GetUnreadNotificationCount(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var unreadCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0`, user.ID).Scan(&unreadCount); err != nil {
		log.Printf("Failed to fetch unread notification count for user %s: %v", user.ID, err)
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"count": unreadCount,
	})
}