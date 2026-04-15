package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"

	"github.com/google/uuid"
)

// FollowHandler handles follow-related routes
type FollowHandler struct {
	db *sql.DB
}

// NewFollowHandler creates a new follow handler
func NewFollowHandler(db *sql.DB) *FollowHandler {
	return &FollowHandler{db: db}
}

// Follow handles following a user
func (h *FollowHandler) Follow(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	targetUserID := r.PathValue("userId")
	if targetUserID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Can't follow yourself
	if targetUserID == currentUser.ID {
		utils.ErrorResponse(w, http.StatusBadRequest, "Cannot follow yourself")
		return
	}

	// Check if target user exists
	var targetUser struct {
		ID       string
		IsPublic bool
	}
	err := h.db.QueryRow(`SELECT id, is_public FROM users WHERE id = ?`, targetUserID).Scan(&targetUser.ID, &targetUser.IsPublic)
	if err == sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}

	// Check if already following or requested
	var existingStatus string
	err = h.db.QueryRow(`
		SELECT status FROM followers 
		WHERE follower_id = ? AND following_id = ?
	`, currentUser.ID, targetUserID).Scan(&existingStatus)

	if err == nil {
		// Already exists
		if existingStatus == "accepted" {
			utils.JSONResponse(w, http.StatusOK, models.FollowResponse{Status: "following"})
			return
		}
		if existingStatus == "pending" {
			utils.JSONResponse(w, http.StatusOK, models.FollowResponse{Status: "requested"})
			return
		}
	}

	// Create follow relationship
	followID := uuid.New().String()
	now := time.Now()

	var status string
	if targetUser.IsPublic {
		// Public profile - instant follow
		status = "accepted"
	} else {
		// Private profile - pending request
		status = "pending"
	}

	_, err = h.db.Exec(`
		INSERT INTO followers (id, follower_id, following_id, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, followID, currentUser.ID, targetUserID, status, now, now)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to follow user")
		return
	}

	// Return response
	responseStatus := "following"
	notificationHandler := NewNotificationHandler(h.db)
	if status == "pending" {
		responseStatus = "requested"
		// Remove any old follow_request notification from the same requester, then create a fresh one
		h.db.Exec(`
			DELETE FROM notifications
			WHERE user_id = ? AND related_user_id = ? AND type = 'follow_request'
		`, targetUserID, currentUser.ID)

		notificationHandler.CreateNotification(
			targetUserID,
			models.NotificationFollowRequest,
			"New follow request",
			currentUser.FirstName+" "+currentUser.LastName+" sent you a follow request",
			currentUser.ID,
			"",
			"",
		)
	} else {
		// Public profile - notify them they have a new follower
		notificationHandler.CreateNotification(
			targetUserID,
			models.NotificationNewFollower,
			"New follower",
			currentUser.FirstName+" "+currentUser.LastName+" started following you",
			currentUser.ID,
			"",
			"",
		)
	}

	utils.JSONResponse(w, http.StatusOK, models.FollowResponse{Status: responseStatus})
}

// Unfollow handles unfollowing a user
func (h *FollowHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	targetUserID := r.PathValue("userId")
	if targetUserID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Delete follow relationship
	_, err := h.db.Exec(`
		DELETE FROM followers 
		WHERE follower_id = ? AND following_id = ?
	`, currentUser.ID, targetUserID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to unfollow user")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{})
}

// AcceptFollowRequest accepts a follow request
func (h *FollowHandler) AcceptFollowRequest(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	requesterID := r.PathValue("requesterId")
	if requesterID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Requester ID is required")
		return
	}

	// Update follow status to accepted
	result, err := h.db.Exec(`
		UPDATE followers 
		SET status = 'accepted', updated_at = ?
		WHERE follower_id = ? AND following_id = ? AND status = 'pending'
	`, time.Now(), requesterID, currentUser.ID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept follow request")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Follow request not found")
		return
	}

	// Mark the follow_request notification as read
	h.db.Exec(`
		UPDATE notifications SET is_read = 1
		WHERE user_id = ? AND related_user_id = ? AND type = 'follow_request'
	`, currentUser.ID, requesterID)

	// Notify the requester that their follow request was accepted
	notificationHandler := NewNotificationHandler(h.db)
	notificationHandler.CreateNotification(
		requesterID,
		models.NotificationFollowAccepted,
		"Follow request accepted",
		currentUser.FirstName+" "+currentUser.LastName+" accepted your follow request",
		currentUser.ID,
		"",
		"",
	)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{})
}

// DeclineFollowRequest declines a follow request
func (h *FollowHandler) DeclineFollowRequest(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	requesterID := r.PathValue("requesterId")
	if requesterID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Requester ID is required")
		return
	}

	// Delete follow request
	result, err := h.db.Exec(`
		DELETE FROM followers 
		WHERE follower_id = ? AND following_id = ? AND status = 'pending'
	`, requesterID, currentUser.ID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decline follow request")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Follow request not found")
		return
	}

	// Mark the follow_request notification as read
	h.db.Exec(`
		UPDATE notifications SET is_read = 1
		WHERE user_id = ? AND related_user_id = ? AND type = 'follow_request'
	`, currentUser.ID, requesterID)

	// Notify the requester that their follow request was declined
	notificationHandler := NewNotificationHandler(h.db)
	notificationHandler.CreateNotification(
		requesterID,
		models.NotificationFollowDeclined,
		"Follow request declined",
		currentUser.FirstName+" "+currentUser.LastName+" declined your follow request",
		currentUser.ID,
		"",
		"",
	)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{})
}

// GetFollowers returns all followers of a user
func (h *FollowHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	userID := r.PathValue("userId")
	if userID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Check if user exists
	var userExists bool
	h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)`, userID).Scan(&userExists)
	if !userExists {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// Get followers (users who follow this user)
	rows, err := h.db.Query(`
		SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url
		FROM followers f
		JOIN users u ON f.follower_id = u.id
		WHERE f.following_id = ? AND f.status = 'accepted'
		ORDER BY f.created_at DESC
	`, userID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	followers := []models.FollowUser{}
	for rows.Next() {
		var follower models.FollowUser
		var avatarURL sql.NullString
		err := rows.Scan(&follower.ID, &follower.FirstName, &follower.LastName, &follower.Username, &avatarURL)
		if err != nil {
			continue
		}
		if avatarURL.Valid {
			follower.AvatarURL = &avatarURL.String
		}
		followers = append(followers, follower)
	}

	utils.JSONResponse(w, http.StatusOK, followers)
}

// GetFollowing returns all users that a user follows
func (h *FollowHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	userID := r.PathValue("userId")
	if userID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Check if user exists
	var userExists bool
	h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)`, userID).Scan(&userExists)
	if !userExists {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// Get following (users this user follows)
	rows, err := h.db.Query(`
		SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url
		FROM followers f
		JOIN users u ON f.following_id = u.id
		WHERE f.follower_id = ? AND f.status = 'accepted'
		ORDER BY f.created_at DESC
	`, userID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	following := []models.FollowUser{}
	for rows.Next() {
		var user models.FollowUser
		var avatarURL sql.NullString
		err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.Username, &avatarURL)
		if err != nil {
			continue
		}
		if avatarURL.Valid {
			user.AvatarURL = &avatarURL.String
		}
		following = append(following, user)
	}

	utils.JSONResponse(w, http.StatusOK, following)
}

// GetPendingRequests returns all pending follow requests for the current user
func (h *FollowHandler) GetPendingRequests(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	// Get pending requests (users who want to follow current user)
	rows, err := h.db.Query(`
		SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, f.created_at
		FROM followers f
		JOIN users u ON f.follower_id = u.id
		WHERE f.following_id = ? AND f.status = 'pending'
		ORDER BY f.created_at DESC
	`, currentUser.ID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	requests := []map[string]interface{}{}
	for rows.Next() {
		var id, firstName, lastName, username string
		var avatarURL sql.NullString
		var createdAt time.Time
		err := rows.Scan(&id, &firstName, &lastName, &username, &avatarURL, &createdAt)
		if err != nil {
			continue
		}
		req := map[string]interface{}{
			"id":        id,
			"firstName": firstName,
			"lastName":  lastName,
			"username":  username,
			"createdAt": createdAt,
		}
		if avatarURL.Valid {
			req["avatarUrl"] = avatarURL.String
		}
		requests = append(requests, req)
	}

	utils.JSONResponse(w, http.StatusOK, requests)
}

// GetMyPendingRequests returns all pending follow requests made by the current user
func (h *FollowHandler) GetMyPendingRequests(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	// Get my pending requests (users I'm waiting to accept my follow)
	rows, err := h.db.Query(`
		SELECT u.id, u.first_name, u.last_name, u.username, u.avatar_url, f.created_at
		FROM followers f
		JOIN users u ON f.following_id = u.id
		WHERE f.follower_id = ? AND f.status = 'pending'
		ORDER BY f.created_at DESC
	`, currentUser.ID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	requests := []map[string]interface{}{}
	for rows.Next() {
		var id, firstName, lastName, username string
		var avatarURL sql.NullString
		var createdAt time.Time
		err := rows.Scan(&id, &firstName, &lastName, &username, &avatarURL, &createdAt)
		if err != nil {
			continue
		}
		req := map[string]interface{}{
			"id":        id,
			"firstName": firstName,
			"lastName":  lastName,
			"username":  username,
			"createdAt": createdAt,
		}
		if avatarURL.Valid {
			req["avatarUrl"] = avatarURL.String
		}
		requests = append(requests, req)
	}

	utils.JSONResponse(w, http.StatusOK, requests)
}

// CancelFollowRequest cancels a pending follow request made by the current user
func (h *FollowHandler) CancelFollowRequest(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	targetUserID := r.PathValue("userId")
	if targetUserID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Delete only pending follow request
	result, err := h.db.Exec(`
		DELETE FROM followers 
		WHERE follower_id = ? AND following_id = ? AND status = 'pending'
	`, currentUser.ID, targetUserID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to cancel request")
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "No pending request found")
		return
	}

	// Delete the follow_request notification for the target user
	h.db.Exec(`
		DELETE FROM notifications
		WHERE user_id = ? AND related_user_id = ? AND type = 'follow_request'
	`, targetUserID, currentUser.ID)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "cancelled"})
}
