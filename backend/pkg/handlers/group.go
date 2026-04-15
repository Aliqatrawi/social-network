package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"
)

// GroupHandler handles group-related routes
type GroupHandler struct {
	db *sql.DB
}

// NewGroupHandler creates a new group handler
func NewGroupHandler(db *sql.DB) *GroupHandler {
	return &GroupHandler{db: db}
}

// CreateGroup creates a new group
func (h *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var req models.GroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group name is required")
		return
	}
	if len(req.Name) > 15 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group name must be 15 characters or less")
		return
	}
	if req.Description != nil && len(*req.Description) > 30 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group description must be 30 characters or less")
		return
	}

	groupID := uuid.New().String()

	// Begin transaction
	tx, err := h.db.Begin()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create group")
		return
	}
	defer tx.Rollback()

	// Create group
	description := sql.NullString{}
	if req.Description != nil {
		description.String = *req.Description
		description.Valid = true
	}

	imageURL := ""
	if req.ImageURL != nil {
		imageURL = *req.ImageURL
	}

	_, err = tx.Exec(`
		INSERT INTO groups (id, name, description, creator_id, image_url)
		VALUES (?, ?, ?, ?, ?)
	`, groupID, req.Name, description, user.ID, imageURL)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	// Add creator as member
	memberID := uuid.New().String()
	_, err = tx.Exec(`
		INSERT INTO group_members (id, group_id, user_id, role)
		VALUES (?, ?, ?, ?)
	`, memberID, groupID, user.ID, "creator")

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	if err := tx.Commit(); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	now := time.Now()
	userResp := user.ToResponse()
	response := models.GroupResponse{
		ID:          groupID,
		Name:        req.Name,
		ImageURL:    imageURL,
		Creator:     &userResp,
		MemberCount: 1,
		IsCreator:   true,
		IsMember:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if req.Description != nil {
		response.Description = req.Description
	}

	utils.JSONResponse(w, http.StatusCreated, response)
}

// GetGroups retrieves all groups
func (h *GroupHandler) GetGroups(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)

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
		SELECT id, name, description, creator_id, created_at, updated_at, COALESCE(image_url, '')
		FROM groups
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch groups")
		return
	}
	defer rows.Close()

	var groups []models.GroupResponse
	for rows.Next() {
		var group models.GroupResponse
		var id, name, creatorID string
		var description sql.NullString
		var createdAt, updatedAt string
		var imageURL string

		if err := rows.Scan(&id, &name, &description, &creatorID, &createdAt, &updatedAt, &imageURL); err != nil {
			continue
		}

		group.ID = id
		group.Name = name
		group.ImageURL = imageURL

		if description.Valid {
			group.Description = &description.String
		}

		// Get creator info
		var creator models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, creatorID).Scan(
			&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName,
			&creator.DateOfBirth, &creator.Username, &creator.Nickname, &creator.AboutMe,
			&creator.AvatarURL, &creator.BannerURL, &creator.IsPublic,
			&creator.CreatedAt, &creator.UpdatedAt); err != nil {
			log.Printf("Failed to fetch creator info for group %s: %v", id, err)
			continue
		}

		creatorResp := creator.ToResponse()
		group.Creator = &creatorResp

		// Get member count
		var memberCount int
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ?`, id).Scan(&memberCount); err != nil {
			log.Printf("Failed to fetch member count for group %s: %v", id, err)
		}
		group.MemberCount = memberCount

		// Check if current user is creator or member
		if currentUser != nil {
			if creatorID == currentUser.ID {
				group.IsCreator = true
				group.IsMember = true
			} else {
				var count int
				if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, id, currentUser.ID).Scan(&count); err != nil {
					log.Printf("Failed to check membership for group %s: %v", id, err)
				}
				group.IsMember = count > 0

				if !group.IsMember {
					var reqCount int
					if err := h.db.QueryRow(`
						SELECT COUNT(*) FROM group_invitations
						WHERE group_id = ? AND user_id = ? AND invited_by_id = user_id AND status = 'pending'
					`, id, currentUser.ID).Scan(&reqCount); err == nil {
						group.HasRequested = reqCount > 0
					}
				}
			}
		}

		groups = append(groups, group)
	}

	if groups == nil {
		groups = []models.GroupResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, groups)
}

// GetGroup retrieves a specific group
func (h *GroupHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("groupId")
	if groupID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	currentUser := middleware.GetUserFromContext(r)

	var group models.GroupResponse
	var id, name, creatorID string
	var description sql.NullString
	var imageURL string

	err := h.db.QueryRow(`
		SELECT id, name, description, creator_id, created_at, updated_at, COALESCE(image_url, '')
		FROM groups WHERE id = ?
	`, groupID).Scan(&id, &name, &description, &creatorID, &group.CreatedAt, &group.UpdatedAt, &imageURL)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch group")
		}
		return
	}

	group.ID = id
	group.Name = name
	group.ImageURL = imageURL

	if description.Valid {
		group.Description = &description.String
	}

	// Get creator info
	var creator models.User
	if err := h.db.QueryRow(`
		SELECT id, email, first_name, last_name, date_of_birth,
			   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
		FROM users WHERE id = ?
	`, creatorID).Scan(
		&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName,
		&creator.DateOfBirth, &creator.Username, &creator.Nickname, &creator.AboutMe,
		&creator.AvatarURL, &creator.BannerURL, &creator.IsPublic,
		&creator.CreatedAt, &creator.UpdatedAt); err != nil {
		log.Printf("Failed to fetch creator info for group %s: %v", groupID, err)
	}

	creatorResp := creator.ToResponse()
	group.Creator = &creatorResp

	// Get member count
	var memberCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ?`, groupID).Scan(&memberCount); err != nil {
		log.Printf("Failed to fetch member count for group %s: %v", groupID, err)
	}
	group.MemberCount = memberCount

	// Get members list
	memberRows, err := h.db.Query(`
		SELECT gm.id, gm.group_id, gm.user_id, gm.role, gm.joined_at
		FROM group_members gm
		WHERE gm.group_id = ?
		ORDER BY gm.joined_at ASC
	`, groupID)

	if err == nil {
		defer memberRows.Close()
		for memberRows.Next() {
			var member models.GroupMember
			var userID string

			if err := memberRows.Scan(&member.ID, &member.GroupID, &userID, &member.Role, &member.JoinedAt); err != nil {
				continue
			}

			member.UserID = userID

			// Get user info
			var user models.User
			if err := h.db.QueryRow(`
				SELECT id, email, first_name, last_name, date_of_birth,
					   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
				FROM users WHERE id = ?
			`, userID).Scan(
				&user.ID, &user.Email, &user.FirstName, &user.LastName,
				&user.DateOfBirth, &user.Username, &user.Nickname, &user.AboutMe,
				&user.AvatarURL, &user.BannerURL, &user.IsPublic,
				&user.CreatedAt, &user.UpdatedAt); err != nil {
				log.Printf("Failed to fetch user info for group member %s: %v", userID, err)
				continue
			}

			userResp := user.ToResponse()
			member.User = &userResp

			group.Members = append(group.Members, member)
		}
	}

	// Check if current user is creator or member
	if currentUser != nil {
		if creatorID == currentUser.ID {
			group.IsCreator = true
			group.IsMember = true
		} else {
			var count int
			if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, currentUser.ID).Scan(&count); err != nil {
				log.Printf("Failed to check membership for group %s: %v", groupID, err)
			}
			group.IsMember = count > 0

			// Check if user has a pending join request
			if !group.IsMember {
				var reqCount int
				if err := h.db.QueryRow(`
					SELECT COUNT(*) FROM group_invitations
					WHERE group_id = ? AND user_id = ? AND invited_by_id = user_id AND status = 'pending'
				`, groupID, currentUser.ID).Scan(&reqCount); err != nil {
					log.Printf("Failed to check join request for group %s: %v", groupID, err)
				}
				group.HasRequested = reqCount > 0
			}
		}
	}

	utils.JSONResponse(w, http.StatusOK, group)
}

// InviteUser invites a user to a group (creator only)
func (h *GroupHandler) InviteUser(w http.ResponseWriter, r *http.Request) {
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

	var req models.GroupInvitationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.UserID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	// Check if user is a member of the group
	var isMember int
	err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID).Scan(&isMember)
	if err != nil || isMember == 0 {
		utils.ErrorResponse(w, http.StatusForbidden, "You must be a member to invite users")
		return
	}

	// Check if user to invite exists
	var targetUserID string
	err = h.db.QueryRow(`SELECT id FROM users WHERE id = ?`, req.UserID).Scan(&targetUserID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// Check if already a member
	var memberCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, req.UserID).Scan(&memberCount); err != nil {
		log.Printf("Failed to check membership for user %s in group %s: %v", req.UserID, groupID, err)
	}
	if memberCount > 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "User is already a member of this group")
		return
	}

	// Check if there's already an invitation/request record
	var existingID string
	var existingStatus string
	err = h.db.QueryRow(`
		SELECT id, status FROM group_invitations
		WHERE group_id = ? AND user_id = ?
	`, groupID, req.UserID).Scan(&existingID, &existingStatus)

	var invitationID string
	if err == nil {
		// Record exists
		if existingStatus == "pending" {
			utils.ErrorResponse(w, http.StatusBadRequest, "User already has a pending invitation")
			return
		}
		// Reuse existing record — reset to pending invitation
		invitationID = existingID
		_, err = h.db.Exec(`
			UPDATE group_invitations SET status = 'pending', invited_by_id = ?
			WHERE id = ?
		`, user.ID, existingID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to invite user")
			return
		}
	} else {
		// No existing record — insert new
		invitationID = uuid.New().String()
		_, err = h.db.Exec(`
			INSERT INTO group_invitations (id, group_id, user_id, invited_by_id, status)
			VALUES (?, ?, ?, ?, ?)
		`, invitationID, groupID, req.UserID, user.ID, "pending")
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to invite user")
			return
		}
	}

	// Get group name
	var groupName string
	if err := h.db.QueryRow(`SELECT name FROM groups WHERE id = ?`, groupID).Scan(&groupName); err != nil {
		log.Printf("Failed to fetch group name for group %s: %v", groupID, err)
	}

	// Create notification for group invitation
	notificationHandler := NewNotificationHandler(h.db)
	notificationHandler.CreateNotification(
		req.UserID,
		models.NotificationGroupInvitation,
		"Group invitation",
		user.FirstName+" "+user.LastName+" invited you to join "+groupName,
		user.ID,
		groupID,
		"",
	)

	// Get invited user info
	var invitedUser models.User
	if err := h.db.QueryRow(`
		SELECT id, email, first_name, last_name, date_of_birth,
			   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
		FROM users WHERE id = ?
	`, req.UserID).Scan(
		&invitedUser.ID, &invitedUser.Email, &invitedUser.FirstName, &invitedUser.LastName,
		&invitedUser.DateOfBirth, &invitedUser.Username, &invitedUser.Nickname, &invitedUser.AboutMe,
		&invitedUser.AvatarURL, &invitedUser.BannerURL, &invitedUser.IsPublic,
		&invitedUser.CreatedAt, &invitedUser.UpdatedAt); err != nil {
		log.Printf("Failed to fetch invited user info for user %s: %v", req.UserID, err)
	}

	invitedUserResp := invitedUser.ToResponse()
	invitation := models.GroupInvitation{
		ID:        invitationID,
		GroupID:   groupID,
		UserID:    req.UserID,
		User:      &invitedUserResp,
		InvitedBy: user.ID,
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	utils.JSONResponse(w, http.StatusCreated, invitation)
}

// AcceptGroupInvitation accepts a group invitation
func (h *GroupHandler) AcceptGroupInvitation(w http.ResponseWriter, r *http.Request) {
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

	// Get invitation
	var invitationID string
	var status string
	err := h.db.QueryRow(`
		SELECT id, status FROM group_invitations 
		WHERE group_id = ? AND user_id = ?
	`, groupID, user.ID).Scan(&invitationID, &status)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Invitation not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept invitation")
		}
		return
	}

	if status != "pending" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invitation is no longer pending")
		return
	}

	// Begin transaction
	tx, err := h.db.Begin()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept invitation")
		return
	}
	defer tx.Rollback()

	// Update invitation status
	_, err = tx.Exec(`UPDATE group_invitations SET status = ? WHERE id = ?`, "accepted", invitationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept invitation")
		return
	}

	// Add user as group member
	memberID := uuid.New().String()
	_, err = tx.Exec(`
		INSERT INTO group_members (id, group_id, user_id, role)
		VALUES (?, ?, ?, ?)
	`, memberID, groupID, user.ID, "member")

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept invitation")
		return
	}

	if err := tx.Commit(); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept invitation")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Invitation accepted"})
}

// DeclineGroupInvitation declines a group invitation
func (h *GroupHandler) DeclineGroupInvitation(w http.ResponseWriter, r *http.Request) {
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

	// Get invitation
	var invitationID string
	var status string
	err := h.db.QueryRow(`
		SELECT id, status FROM group_invitations 
		WHERE group_id = ? AND user_id = ?
	`, groupID, user.ID).Scan(&invitationID, &status)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Invitation not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decline invitation")
		}
		return
	}

	if status != "pending" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invitation is no longer pending")
		return
	}

	// Get the inviter ID and group name before declining
	var invitedByID string
	err = h.db.QueryRow(`SELECT invited_by_id FROM group_invitations WHERE id = ?`, invitationID).Scan(&invitedByID)
	if err != nil {
		log.Printf("Failed to fetch inviter for invitation %s: %v", invitationID, err)
	}

	var groupName string
	if err := h.db.QueryRow(`SELECT name FROM groups WHERE id = ?`, groupID).Scan(&groupName); err != nil {
		log.Printf("Failed to fetch group name for group %s: %v", groupID, err)
	}

	// Update invitation status
	_, err = h.db.Exec(`UPDATE group_invitations SET status = ? WHERE id = ?`, "declined", invitationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decline invitation")
		return
	}

	// Notify the inviter that the invitation was declined
	if invitedByID != "" && invitedByID != user.ID {
		notificationHandler := NewNotificationHandler(h.db)
		if err := notificationHandler.CreateNotification(
			invitedByID,
			models.NotificationGroupInvitationDeclined,
			"Invitation Declined",
			user.FirstName+" "+user.LastName+" declined your invitation to join "+groupName,
			user.ID,
			groupID,
			"",
		); err != nil {
			log.Printf("Failed to create invitation declined notification: %v", err)
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Invitation declined"})
}

// RequestToJoinGroup sends a request to join a private group
func (h *GroupHandler) RequestToJoinGroup(w http.ResponseWriter, r *http.Request) {
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

	// Check if group exists
	var count int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM groups WHERE id = ?`, groupID).Scan(&count); err != nil {
		log.Printf("Failed to check if group %s exists: %v", groupID, err)
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to request join")
		return
	}
	if count == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		return
	}

	// Check if already a member
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID).Scan(&count); err != nil {
		log.Printf("Failed to check membership for group %s: %v", groupID, err)
	}
	if count > 0 {
		utils.ErrorResponse(w, http.StatusBadRequest, "You are already a member of this group")
		return
	}

	// Check if there's already an invitation/request record for this user+group
	var existingID string
	var existingStatus string
	err := h.db.QueryRow(`
		SELECT id, status FROM group_invitations
		WHERE group_id = ? AND user_id = ?
	`, groupID, user.ID).Scan(&existingID, &existingStatus)

	var requestID string
	if err == nil {
		// Record exists
		if existingStatus == "pending" {
			utils.ErrorResponse(w, http.StatusBadRequest, "You already have a pending request")
			return
		}
		// Reuse existing record — reset to pending join request
		requestID = existingID
		_, err = h.db.Exec(`
			UPDATE group_invitations SET status = 'pending', invited_by_id = user_id
			WHERE id = ?
		`, existingID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to request join")
			return
		}
	} else {
		// No existing record — insert new
		requestID = uuid.New().String()
		_, err = h.db.Exec(`
			INSERT INTO group_invitations (id, group_id, user_id, invited_by_id, status)
			VALUES (?, ?, ?, ?, ?)
		`, requestID, groupID, user.ID, user.ID, "pending")
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to request join")
			return
		}
	}

	// Get group name and creator
	var groupName, creatorID string
	if err := h.db.QueryRow(`SELECT name, creator_id FROM groups WHERE id = ?`, groupID).Scan(&groupName, &creatorID); err != nil {
		log.Printf("Failed to fetch group name/creator for group %s: %v", groupID, err)
	}

	// Only send notification if there isn't already one for this user+group+type
	var existingNotif int
	if err := h.db.QueryRow(`
		SELECT COUNT(*) FROM notifications
		WHERE user_id = ? AND type = ? AND related_user_id = ? AND group_id = ?
	`, creatorID, models.NotificationGroupJoinRequest, user.ID, groupID).Scan(&existingNotif); err != nil {
		log.Printf("Failed to check existing notification: %v", err)
	}
	if existingNotif == 0 {
		notificationHandler := NewNotificationHandler(h.db)
		notificationHandler.CreateNotification(
			creatorID,
			models.NotificationGroupJoinRequest,
			"Group join request",
			user.FirstName+" "+user.LastName+" requested to join "+groupName,
			user.ID,
			groupID,
			"",
		)
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]string{
		"message": "Join request sent",
		"id":      requestID,
	})
}

// CancelJoinRequest cancels the current user's pending join request
func (h *GroupHandler) CancelJoinRequest(w http.ResponseWriter, r *http.Request) {
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

	// Delete the pending join request (where invited_by_id = user_id means it's a self-request)
	result, err := h.db.Exec(`
		DELETE FROM group_invitations
		WHERE group_id = ? AND user_id = ? AND invited_by_id = user_id AND status = 'pending'
	`, groupID, user.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to cancel request")
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "No pending request found")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Join request cancelled"})
}

// GetGroupJoinRequests gets pending join requests for a group (creator only)
func (h *GroupHandler) GetGroupJoinRequests(w http.ResponseWriter, r *http.Request) {
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

	// Check if user is group creator
	var creatorID string
	err := h.db.QueryRow(`SELECT creator_id FROM groups WHERE id = ?`, groupID).Scan(&creatorID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch requests")
		}
		return
	}

	if creatorID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "Only group creator can view join requests")
		return
	}

	rows, err := h.db.Query(`
		SELECT gi.id, gi.user_id, gi.status, gi.created_at
		FROM group_invitations gi
		WHERE gi.group_id = ? AND gi.invited_by_id = gi.user_id AND gi.status = ?
		ORDER BY gi.created_at DESC
	`, groupID, "pending")

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch requests")
		return
	}
	defer rows.Close()

	var requests []models.JoinRequest
	for rows.Next() {
		var req models.JoinRequest
		var userID string

		if err := rows.Scan(&req.ID, &userID, &req.Status, &req.CreatedAt); err != nil {
			continue
		}

		req.GroupID = groupID
		req.UserID = userID

		// Get user info
		var user models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, userID).Scan(
			&user.ID, &user.Email, &user.FirstName, &user.LastName,
			&user.DateOfBirth, &user.Username, &user.Nickname, &user.AboutMe,
			&user.AvatarURL, &user.BannerURL, &user.IsPublic,
			&user.CreatedAt, &user.UpdatedAt); err != nil {
			log.Printf("Failed to fetch user info for join request user %s: %v", userID, err)
			continue
		}

		userResp := user.ToResponse()
		req.User = &userResp

		requests = append(requests, req)
	}

	if requests == nil {
		requests = []models.JoinRequest{}
	}

	utils.JSONResponse(w, http.StatusOK, requests)
}

// AcceptJoinRequest accepts a join request (creator only)
func (h *GroupHandler) AcceptJoinRequest(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	groupID := r.PathValue("groupId")
	requestID := r.PathValue("requestId")

	if groupID == "" || requestID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group ID and Request ID are required")
		return
	}

	// Check if user is group creator
	var creatorID string
	var groupName string
	err := h.db.QueryRow(`SELECT creator_id, name FROM groups WHERE id = ?`, groupID).Scan(&creatorID, &groupName)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept request")
		}
		return
	}

	if creatorID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "Only group creator can accept join requests")
		return
	}

	// Get request - requestID can be the invitation record ID or the user ID
	var invitationID string
	var requestUserID string
	var status string
	err = h.db.QueryRow(`
		SELECT id, user_id, status FROM group_invitations
		WHERE (id = ? OR user_id = ?) AND group_id = ? AND invited_by_id = user_id AND status = 'pending'
		LIMIT 1
	`, requestID, requestID, groupID).Scan(&invitationID, &requestUserID, &status)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Request not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept request")
		}
		return
	}

	// Begin transaction
	tx, err := h.db.Begin()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept request")
		return
	}
	defer tx.Rollback()

	// Update request status
	_, err = tx.Exec(`UPDATE group_invitations SET status = ? WHERE id = ?`, "accepted", invitationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept request")
		return
	}

	// Add user as group member
	memberID := uuid.New().String()
	_, err = tx.Exec(`
		INSERT INTO group_members (id, group_id, user_id, role)
		VALUES (?, ?, ?, ?)
	`, memberID, groupID, requestUserID, "member")

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept request")
		return
	}

	if err := tx.Commit(); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to accept request")
		return
	}

	// Notify the accepted user
	notificationHandler := NewNotificationHandler(h.db)
	notificationHandler.CreateNotification(
		requestUserID,
		models.NotificationGroupJoinAccepted,
		"Join request accepted",
		"You were accepted into "+groupName,
		user.ID,
		groupID,
		"",
	)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Join request accepted"})
}

// DeclineJoinRequest declines a join request (creator only)
func (h *GroupHandler) DeclineJoinRequest(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	groupID := r.PathValue("groupId")
	requestID := r.PathValue("requestId")

	if groupID == "" || requestID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group ID and Request ID are required")
		return
	}

	// Check if user is group creator
	var creatorID string
	err := h.db.QueryRow(`SELECT creator_id FROM groups WHERE id = ?`, groupID).Scan(&creatorID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decline request")
		}
		return
	}

	if creatorID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "Only group creator can decline join requests")
		return
	}

	// Get request - requestID can be the invitation record ID or the user ID
	var invitationID string
	err = h.db.QueryRow(`
		SELECT id FROM group_invitations
		WHERE (id = ? OR user_id = ?) AND group_id = ? AND invited_by_id = user_id AND status = 'pending'
		LIMIT 1
	`, requestID, requestID, groupID).Scan(&invitationID)

	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Request not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decline request")
		}
		return
	}

	// Update request status
	_, err = h.db.Exec(`UPDATE group_invitations SET status = ? WHERE id = ?`, "declined", invitationID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to decline request")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Join request declined"})
}

// GetMyGroups returns groups the current user is a member of
func (h *GroupHandler) GetMyGroups(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(`
		SELECT g.id, g.name, g.description, g.creator_id, g.created_at, g.updated_at, COALESCE(g.image_url, '')
		FROM groups g
		JOIN group_members gm ON gm.group_id = g.id
		WHERE gm.user_id = ?
		ORDER BY g.created_at DESC
	`, user.ID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch groups")
		return
	}
	defer rows.Close()

	var groups []models.GroupResponse
	for rows.Next() {
		var id, name, creatorID string
		var description sql.NullString
		var createdAt, updatedAt string
		var imageURL string

		if err := rows.Scan(&id, &name, &description, &creatorID, &createdAt, &updatedAt, &imageURL); err != nil {
			continue
		}

		group := models.GroupResponse{ID: id, Name: name, ImageURL: imageURL}
		if description.Valid {
			group.Description = &description.String
		}

		// Get creator info
		var creator models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, creatorID).Scan(
			&creator.ID, &creator.Email, &creator.FirstName, &creator.LastName,
			&creator.DateOfBirth, &creator.Username, &creator.Nickname, &creator.AboutMe,
			&creator.AvatarURL, &creator.BannerURL, &creator.IsPublic,
			&creator.CreatedAt, &creator.UpdatedAt); err != nil {
			log.Printf("Failed to fetch creator info for group %s: %v", id, err)
			continue
		}

		creatorResp := creator.ToResponse()
		group.Creator = &creatorResp

		var memberCount int
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ?`, id).Scan(&memberCount); err != nil {
			log.Printf("Failed to fetch member count for group %s: %v", id, err)
		}
		group.MemberCount = memberCount
		group.IsMember = true
		group.IsCreator = creatorID == user.ID

		groups = append(groups, group)
	}

	if groups == nil {
		groups = []models.GroupResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, groups)
}

// GetGroupMembers returns the members of a group
func (h *GroupHandler) GetGroupMembers(w http.ResponseWriter, r *http.Request) {
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

	// Check group exists
	var count int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM groups WHERE id = ?`, groupID).Scan(&count); err != nil || count == 0 {
		utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		return
	}

	rows, err := h.db.Query(`
		SELECT gm.user_id, gm.role, gm.joined_at
		FROM group_members gm
		WHERE gm.group_id = ?
		ORDER BY gm.joined_at ASC
	`, groupID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch members")
		return
	}
	defer rows.Close()

	type MemberResponse struct {
		UserID    string              `json:"userId"`
		FirstName string              `json:"firstName"`
		LastName  string              `json:"lastName"`
		AvatarURL *string             `json:"avatarUrl"`
		Username  string              `json:"username"`
		Role      string              `json:"role"`
	}

	var members []MemberResponse
	for rows.Next() {
		var userID, role string
		var joinedAt string

		if err := rows.Scan(&userID, &role, &joinedAt); err != nil {
			continue
		}

		var u models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, userID).Scan(
			&u.ID, &u.Email, &u.FirstName, &u.LastName,
			&u.DateOfBirth, &u.Username, &u.Nickname, &u.AboutMe,
			&u.AvatarURL, &u.BannerURL, &u.IsPublic,
			&u.CreatedAt, &u.UpdatedAt); err != nil {
			continue
		}

		member := MemberResponse{
			UserID:    userID,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Username:  u.Username,
			Role:      role,
		}
		if u.AvatarURL.Valid {
			member.AvatarURL = &u.AvatarURL.String
		}

		members = append(members, member)
	}

	if members == nil {
		members = []MemberResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, members)
}

// GetGroupInvitations returns pending invitations for the current user
func (h *GroupHandler) GetGroupInvitations(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(`
		SELECT gi.id, gi.group_id, gi.invited_by_id, gi.created_at, g.name
		FROM group_invitations gi
		JOIN groups g ON g.id = gi.group_id
		WHERE gi.user_id = ? AND gi.status = ? AND gi.invited_by_id != gi.user_id
		ORDER BY gi.created_at DESC
	`, user.ID, "pending")

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch invitations")
		return
	}
	defer rows.Close()

	type InvitationResponse struct {
		ID        string `json:"id"`
		GroupID   string `json:"groupId"`
		GroupName string `json:"groupName"`
		InviterID string `json:"inviterId"`
		Inviter   *models.UserResponse `json:"inviter"`
		CreatedAt string `json:"createdAt"`
	}

	var invitations []InvitationResponse
	for rows.Next() {
		var inv InvitationResponse
		if err := rows.Scan(&inv.ID, &inv.GroupID, &inv.InviterID, &inv.CreatedAt, &inv.GroupName); err != nil {
			continue
		}

		var inviter models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, inv.InviterID).Scan(
			&inviter.ID, &inviter.Email, &inviter.FirstName, &inviter.LastName,
			&inviter.DateOfBirth, &inviter.Username, &inviter.Nickname, &inviter.AboutMe,
			&inviter.AvatarURL, &inviter.BannerURL, &inviter.IsPublic,
			&inviter.CreatedAt, &inviter.UpdatedAt); err == nil {
			resp := inviter.ToResponse()
			inv.Inviter = &resp
		}

		invitations = append(invitations, inv)
	}

	if invitations == nil {
		invitations = []InvitationResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, invitations)
}

// DeleteGroup deletes a group (creator only)
func (h *GroupHandler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
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

	// Check if user is group creator
	var creatorID string
	err := h.db.QueryRow(`SELECT creator_id FROM groups WHERE id = ?`, groupID).Scan(&creatorID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete group")
		}
		return
	}

	if creatorID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "Only group creator can delete the group")
		return
	}

	// CASCADE will handle group_members and group_invitations
	_, err = h.db.Exec(`DELETE FROM groups WHERE id = ?`, groupID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete group")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Group deleted"})
}

// KickMember removes a member from the group (creator only) and sends them a notification
func (h *GroupHandler) KickMember(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	groupID := r.PathValue("groupId")
	memberID := r.PathValue("memberId")

	if groupID == "" || memberID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group ID and Member ID are required")
		return
	}

	// Cannot kick yourself
	if memberID == user.ID {
		utils.ErrorResponse(w, http.StatusBadRequest, "You cannot kick yourself. Use leave instead.")
		return
	}

	// Check if user is group creator
	var creatorID string
	var groupName string
	err := h.db.QueryRow(`SELECT creator_id, name FROM groups WHERE id = ?`, groupID).Scan(&creatorID, &groupName)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to kick member")
		}
		return
	}

	if creatorID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "Only group creator can kick members")
		return
	}

	// Cannot kick the creator
	if memberID == creatorID {
		utils.ErrorResponse(w, http.StatusBadRequest, "Cannot kick the group creator")
		return
	}

	// Check if the target is actually a member
	var exists bool
	err = h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)`, groupID, memberID).Scan(&exists)
	if err != nil || !exists {
		utils.ErrorResponse(w, http.StatusNotFound, "Member not found in this group")
		return
	}

	// Remove member
	_, err = h.db.Exec(`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, memberID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to kick member")
		return
	}

	// Send notification to the kicked member
	notificationHandler := NewNotificationHandler(h.db)
	notificationHandler.CreateNotification(
		memberID,
		models.NotificationGroupKicked,
		"Removed from group",
		"You were removed from "+groupName,
		user.ID,
		groupID,
		"",
	)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Member kicked"})
}

// LeaveGroup allows a member to leave a group
func (h *GroupHandler) LeaveGroup(w http.ResponseWriter, r *http.Request) {
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

	// Check if group exists and user is not the creator
	var creatorID string
	var groupName string
	err := h.db.QueryRow(`SELECT creator_id, name FROM groups WHERE id = ?`, groupID).Scan(&creatorID, &groupName)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Group not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to leave group")
		}
		return
	}

	if creatorID == user.ID {
		utils.ErrorResponse(w, http.StatusBadRequest, "Group creator cannot leave. Delete the group instead.")
		return
	}

	// Check if user is actually a member
	var exists bool
	err = h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)`, groupID, user.ID).Scan(&exists)
	if err != nil || !exists {
		utils.ErrorResponse(w, http.StatusBadRequest, "You are not a member of this group")
		return
	}

	// Remove from group_members
	_, err = h.db.Exec(`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to leave group")
		return
	}

	// Notify the group creator
	notificationHandler := NewNotificationHandler(h.db)
	notificationHandler.CreateNotification(
		creatorID,
		models.NotificationGroupMemberLeft,
		"Member left",
		user.FirstName+" "+user.LastName+" left "+groupName,
		user.ID,
		groupID,
		"",
	)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Left the group"})
}
