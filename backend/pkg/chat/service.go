package chat

import (
	"database/sql"
	"errors"
)

var (
	ErrNotAllowed = errors.New("not allowed")
	ErrNotFound   = errors.New("not found")
)

type Service struct {
	repo *Repo
	db   *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{
		repo: NewRepo(db),
		db:   db,
	}
}

func (s *Service) Repo() *Repo { return s.repo }

// CanPrivateChat checks if at least one user follows the other with status 'accepted'.
func (s *Service) CanPrivateChat(userA, userB string) (bool, error) {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(1)
		FROM followers
		WHERE status = 'accepted'
		  AND ((follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?))
	`, userA, userB, userB, userA).Scan(&count)
	return count > 0, err
}

// CanAccessPrivateConversation allows reading an existing private conversation if
// the users can currently chat OR the conversation already has message history.
func (s *Service) CanAccessPrivateConversation(userID, otherUserID, conversationID string) (bool, error) {
	allowed, err := s.CanPrivateChat(userID, otherUserID)
	if err != nil {
		return false, err
	}
	if allowed {
		return true, nil
	}

	hasHistory, err := s.repo.PrivateConversationHasHistory(conversationID)
	if err != nil {
		return false, err
	}
	return hasHistory, nil
}

// IsGroupMember checks if user is a member of a group.
func (s *Service) IsGroupMember(userID, groupID string) (bool, error) {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(1) FROM group_members WHERE user_id = ? AND group_id = ?
	`, userID, groupID).Scan(&count)
	return count > 0, err
}
