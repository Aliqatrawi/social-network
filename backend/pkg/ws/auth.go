package ws

import (
	"database/sql"
	"net/http"

	"social-network/backend/pkg/models"
)

// AuthenticateFromCookie validates session_id and returns userID.
func AuthenticateFromCookie(db *sql.DB, r *http.Request) (string, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return "", err
	}

	var session models.Session
	err = db.QueryRow(`
		SELECT id, user_id, expires_at, created_at
		FROM sessions
		WHERE id = ?
	`, cookie.Value).Scan(&session.ID, &session.UserID, &session.ExpiresAt, &session.CreatedAt)
	if err != nil {
		return "", err
	}
	if session.IsExpired() {
		return "", sql.ErrNoRows
	}
	return session.UserID, nil
}
