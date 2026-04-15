package handlers

import (
	"database/sql"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"

	"github.com/google/uuid"
)

// AuthHandler handles authentication routes
type AuthHandler struct {
	db *sql.DB
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	// Get required fields
	email := strings.TrimSpace(r.FormValue("email"))
	password := r.FormValue("password")
	firstName := strings.TrimSpace(r.FormValue("firstName"))
	lastName := strings.TrimSpace(r.FormValue("lastName"))
	dateOfBirth := r.FormValue("dateOfBirth")

	// Validate required fields
	if email == "" || password == "" || firstName == "" || lastName == "" || dateOfBirth == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Email, password, first name, last name, and date of birth are required")
		return
	}

	if len(firstName) > 10 {
		utils.ErrorResponse(w, http.StatusBadRequest, "First name must be 10 characters or less")
		return
	}

	if len(lastName) > 10 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Last name must be 10 characters or less")
		return
	}

	if len(email) > 254 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Email must be 254 characters or less")
		return
	}

	if len(password) > 72 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Password must be 72 characters or less")
		return
	}

	// Validate email format
	if !strings.Contains(email, "@") {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid email format")
		return
	}

	// Check if email already exists
	var exists bool
	err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)", email).Scan(&exists)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	if exists {
		utils.ErrorResponse(w, http.StatusConflict, "Email already registered")
		return
	}

	// Get username (required) and optional fields
	username := strings.TrimSpace(r.FormValue("username"))
	nickname := strings.TrimSpace(r.FormValue("nickname"))
	aboutMe := strings.TrimSpace(r.FormValue("aboutMe"))

	if username == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Username is required")
		return
	}

	// Check username uniqueness
	var usernameExists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)", username).Scan(&usernameExists)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}
	if usernameExists {
		utils.ErrorResponse(w, http.StatusConflict, "Username already taken")
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	// Generate user ID
	userID := uuid.New().String()

	// Handle avatar upload
	var avatarURL string
	file, header, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()

		// Validate file type
		contentType := header.Header.Get("Content-Type")
		if !isValidImageType(contentType) {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid image type. Only JPEG, PNG, and WebP are allowed")
			return
		}

		// Create uploads directory
		uploadDir := "./uploads/avatars"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create upload directory")
			return
		}

		// Generate filename
		ext := filepath.Ext(header.Filename)
		filename := userID + ext
		filePath := filepath.Join(uploadDir, filename)

		// Save file
		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save avatar")
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save avatar")
			return
		}

		avatarURL = "/uploads/avatars/" + filename
	}

	// Insert user
	now := time.Now()
	_, err = h.db.Exec(`
		INSERT INTO users (id, email, password_hash, first_name, last_name, date_of_birth, username, nickname, about_me, avatar_url, is_public, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		userID,
		email,
		hashedPassword,
		firstName,
		lastName,
		dateOfBirth,
		username,
		nullString(nickname),
		nullString(aboutMe),
		nullString(avatarURL),
		true, // Default to public profile
		now,
		now,
	)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Create session
	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(7 * 24 * time.Hour) // 7 days

	_, err = h.db.Exec(`
		INSERT INTO sessions (id, user_id, expires_at, created_at)
		VALUES (?, ?, ?, ?)
	`, sessionID, userID, expiresAt, time.Now())

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	// Return user response
	response := models.UserResponse{
		ID:          userID,
		Email:       email,
		FirstName:   firstName,
		LastName:    lastName,
		DateOfBirth: dateOfBirth,
		Username:    username,
		AboutMe:     ptrString(aboutMe),
		AvatarURL:   ptrString(avatarURL),
		BannerURL:   nil,
		IsPublic:    true,
	}

	utils.JSONResponse(w, http.StatusCreated, response)
}

// Login handles user login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := utils.ParseJSON(r, &req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if req.Email == "" || req.Password == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Find user by email
	var user models.User
	err := h.db.QueryRow(`
		SELECT id, email, password_hash, first_name, last_name, date_of_birth,
		       username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
		FROM users
		WHERE email = ?
	`, req.Email).Scan(
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
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
		return
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.Password) {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Delete existing sessions for this user (optional: single session per user)
	// h.db.Exec("DELETE FROM sessions WHERE user_id = ?", user.ID)

	// Create new session
	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(7 * 24 * time.Hour) // 7 days

	_, err = h.db.Exec(`
		INSERT INTO sessions (id, user_id, expires_at, created_at)
		VALUES (?, ?, ?, ?)
	`, sessionID, user.ID, expiresAt, time.Now())

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	utils.JSONResponse(w, http.StatusOK, user.ToResponse())
}

// Logout handles user logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSessionFromContext(r)
	if session == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	// Delete session from database
	_, err := h.db.Exec("DELETE FROM sessions WHERE id = ?", session.ID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete session")
		return
	}

	// Clear session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{})
}

// Helper functions
func isValidImageType(contentType string) bool {
	validTypes := []string{"image/jpeg", "image/png", "image/webp", "image/gif"}
	for _, t := range validTypes {
		if contentType == t {
			return true
		}
	}
	return false
}

func nullString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func ptrString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
