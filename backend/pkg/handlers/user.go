package handlers

import (
	"database/sql"
	"net/http"

	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"
)

// UserHandler handles user profile routes
type UserHandler struct {
	db *sql.DB
}

// NewUserHandler creates a new user handler
func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{db: db}
}

// GetCurrentUser returns the authenticated user
func (h *UserHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}
	utils.JSONResponse(w, http.StatusOK, user.ToResponse())
}

// GetUser returns a user's profile with stats
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	if userID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	currentUser := middleware.GetUserFromContext(r)

	// Get user from database
	var user models.User
	err := h.db.QueryRow(`
		SELECT id, email, password_hash, first_name, last_name, date_of_birth,
		       username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
		FROM users
		WHERE id = ?
	`, userID).Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.FirstName,
		&user.LastName,
		&user.DateOfBirth,
		&user.Username,
		&user.Nickname,
		&user.AboutMe,
		&user.AvatarURL,
		&user.BannerURL,
		&user.IsPublic,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}

	// Get followers count
	var followersCount int
	h.db.QueryRow(`SELECT COUNT(*) FROM followers WHERE following_id = ? AND status = 'accepted'`, userID).Scan(&followersCount)

	// Get following count
	var followingCount int
	h.db.QueryRow(`SELECT COUNT(*) FROM followers WHERE follower_id = ? AND status = 'accepted'`, userID).Scan(&followingCount)

	// Get posts count
	var postsCount int
	h.db.QueryRow(`SELECT COUNT(*) FROM posts WHERE user_id = ?`, userID).Scan(&postsCount)

	// Activities count (same as posts for now)
	activitiesCount := postsCount

	// Check if current user follows this user
	var isFollowedByMe bool
	var isFollowRequested bool

	if currentUser != nil && currentUser.ID != userID {
		var status string
		err := h.db.QueryRow(`
			SELECT status FROM followers
			WHERE follower_id = ? AND following_id = ?
		`, currentUser.ID, userID).Scan(&status)

		if err == nil {
			if status == "accepted" {
				isFollowedByMe = true
			} else if status == "pending" {
				isFollowRequested = true
			}
		}
	}

	// Return profile response
	response := user.ToProfileResponse(
		followersCount,
		followingCount,
		postsCount,
		activitiesCount,
		isFollowedByMe,
		isFollowRequested,
	)

	utils.JSONResponse(w, http.StatusOK, response)
}

// UpdateProfile updates the authenticated user's profile
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var req struct {
		FirstName *string `json:"firstName"`
		LastName  *string `json:"lastName"`
		Username  *string `json:"username"`
		Nickname  *string `json:"nickname"`
		AboutMe   *string `json:"aboutMe"`
		AvatarURL *string `json:"avatarUrl"`
		BannerURL *string `json:"bannerUrl"`
		IsPublic  *bool   `json:"isPublic"`
	}

	if err := utils.ParseJSON(r, &req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}

	if req.FirstName != nil {
		updates = append(updates, "first_name = ?")
		args = append(args, *req.FirstName)
	}
	if req.LastName != nil {
		updates = append(updates, "last_name = ?")
		args = append(args, *req.LastName)
	}
	if req.Username != nil {
		// Username cannot be empty
		if *req.Username == "" {
			utils.ErrorResponse(w, http.StatusBadRequest, "Username cannot be empty")
			return
		}
		// Check uniqueness
		var exists bool
		h.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE username = ? AND id != ?)`, *req.Username, currentUser.ID).Scan(&exists)
		if exists {
			utils.ErrorResponse(w, http.StatusConflict, "Username already taken")
			return
		}
		updates = append(updates, "username = ?")
		args = append(args, *req.Username)
	}
	if req.Nickname != nil {
		updates = append(updates, "nickname = ?")
		if *req.Nickname == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.Nickname)
		}
	}
	if req.AboutMe != nil {
		updates = append(updates, "about_me = ?")
		if *req.AboutMe == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.AboutMe)
		}
	}
	if req.AvatarURL != nil {
		updates = append(updates, "avatar_url = ?")
		if *req.AvatarURL == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.AvatarURL)
		}
	}
	if req.BannerURL != nil {
		updates = append(updates, "banner_url = ?")
		if *req.BannerURL == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.BannerURL)
		}
	}
	if req.IsPublic != nil {
		updates = append(updates, "is_public = ?")
		args = append(args, *req.IsPublic)
	}

	if len(updates) == 0 {
		// No updates, just return current user
		utils.JSONResponse(w, http.StatusOK, currentUser.ToResponse())
		return
	}

	// Add updated_at and user ID
	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, currentUser.ID)

	// Build and execute query
	query := "UPDATE users SET "
	for i, update := range updates {
		if i > 0 {
			query += ", "
		}
		query += update
	}
	query += " WHERE id = ?"

	_, err := h.db.Exec(query, args...)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	// Fetch updated user
	var updatedUser models.User
	err = h.db.QueryRow(`
		SELECT id, email, password_hash, first_name, last_name, date_of_birth,
		       username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
		FROM users
		WHERE id = ?
	`, currentUser.ID).Scan(
		&updatedUser.ID,
		&updatedUser.Email,
		&updatedUser.Password,
		&updatedUser.FirstName,
		&updatedUser.LastName,
		&updatedUser.DateOfBirth,
		&updatedUser.Username,
		&updatedUser.Nickname,
		&updatedUser.AboutMe,
		&updatedUser.AvatarURL,
		&updatedUser.BannerURL,
		&updatedUser.IsPublic,
		&updatedUser.CreatedAt,
		&updatedUser.UpdatedAt,
	)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch updated profile")
		return
	}

	utils.JSONResponse(w, http.StatusOK, updatedUser.ToResponse())
}

// GetAllUsers returns all users (for search/discovery)
func (h *UserHandler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(`
		SELECT id, email, first_name, last_name, date_of_birth,
		       username, nickname, about_me, avatar_url, banner_url, is_public
		FROM users
		WHERE id != ?
		ORDER BY first_name, last_name
	`, currentUser.ID)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	users := []models.UserResponse{}
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.DateOfBirth,
			&user.Username,
			&user.Nickname,
			&user.AboutMe,
			&user.AvatarURL,
			&user.BannerURL,
			&user.IsPublic,
		)
		if err != nil {
			continue
		}
		users = append(users, user.ToResponse())
	}

	utils.JSONResponse(w, http.StatusOK, users)
}

// Search searches for users by name or username
func (h *UserHandler) Search(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		// Return empty results if no query
		utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"users":  []interface{}{},
			"posts":  []interface{}{},
			"groups": []interface{}{},
		})
		return
	}

	// Search users by first name, last name, or username
	searchPattern := "%" + query + "%"
	rows, err := h.db.Query(`
		SELECT id, email, first_name, last_name, date_of_birth,
		       username, nickname, about_me, avatar_url, banner_url, is_public
		FROM users
		WHERE id != ? AND (
			first_name LIKE ? OR
			last_name LIKE ? OR
			username LIKE ? OR
			email LIKE ?
		)
		ORDER BY first_name, last_name
		LIMIT 20
	`, currentUser.ID, searchPattern, searchPattern, searchPattern, searchPattern)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	users := []models.UserResponse{}
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.DateOfBirth,
			&user.Username,
			&user.Nickname,
			&user.AboutMe,
			&user.AvatarURL,
			&user.BannerURL,
			&user.IsPublic,
		)
		if err != nil {
			continue
		}
		users = append(users, user.ToResponse())
	}

	// Return search response
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"users":  users,
		"posts":  []interface{}{},
		"groups": []interface{}{},
	})
}
