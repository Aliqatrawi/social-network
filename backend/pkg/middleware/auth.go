package middleware

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"
)

// ContextKey is a custom type for context keys
type ContextKey string

const (
	// UserContextKey is the key for user in context
	UserContextKey ContextKey = "user"
	// SessionContextKey is the key for session in context
	SessionContextKey ContextKey = "session"
)

// RequireAuth middleware checks if user is authenticated
func RequireAuth(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get session cookie
		cookie, err := r.Cookie("session_id")
		if err != nil {
			utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
			return
		}

		// Look up session
		var session models.Session
		err = db.QueryRow(`
			SELECT id, user_id, expires_at, created_at 
			FROM sessions 
			WHERE id = ?
		`, cookie.Value).Scan(
			&session.ID,
			&session.UserID,
			&session.ExpiresAt,
			&session.CreatedAt,
		)

		if err == sql.ErrNoRows {
			// Clear invalid cookie
			http.SetCookie(w, &http.Cookie{
				Name:     "session_id",
				Value:    "",
				Path:     "/",
				Expires:  time.Unix(0, 0),
				HttpOnly: true,
			})
			utils.ErrorResponse(w, http.StatusUnauthorized, "Session not found")
			return
		}

		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
			return
		}

		// Check if session expired
		if session.IsExpired() {
			// Delete expired session
			db.Exec("DELETE FROM sessions WHERE id = ?", session.ID)
			http.SetCookie(w, &http.Cookie{
				Name:     "session_id",
				Value:    "",
				Path:     "/",
				Expires:  time.Unix(0, 0),
				HttpOnly: true,
			})
			utils.ErrorResponse(w, http.StatusUnauthorized, "Session expired")
			return
		}

		// Get user
		var user models.User
		err = db.QueryRow(`
			SELECT id, email, password_hash, first_name, last_name, date_of_birth,
			       username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users
			WHERE id = ?
		`, session.UserID).Scan(
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
			utils.ErrorResponse(w, http.StatusUnauthorized, "User not found")
			return
		}

		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Database error")
			return
		}

		// Add user and session to context
		ctx := context.WithValue(r.Context(), UserContextKey, &user)
		ctx = context.WithValue(ctx, SessionContextKey, &session)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// GetUserFromContext retrieves the authenticated user from context
func GetUserFromContext(r *http.Request) *models.User {
	user, ok := r.Context().Value(UserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}

// GetSessionFromContext retrieves the session from context
func GetSessionFromContext(r *http.Request) *models.Session {
	session, ok := r.Context().Value(SessionContextKey).(*models.Session)
	if !ok {
		return nil
	}
	return session
}
