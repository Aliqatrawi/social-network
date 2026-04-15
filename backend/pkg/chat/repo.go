package chat

import (
	"database/sql"
	"sort"
	"time"

	"github.com/google/uuid"
	"social-network/backend/pkg/models"
)

type Repo struct {
	DB *sql.DB
}

func NewRepo(db *sql.DB) *Repo {
	return &Repo{DB: db}
}

// EnsurePrivateConversation returns an existing conversation for the pair, or creates it.
// IMPORTANT: user1_id < user2_id must be enforced (matches migration CHECK constraint).
func (r *Repo) EnsurePrivateConversation(userA, userB string) (models.PrivateConversationRow, error) {
	u1, u2 := orderPair(userA, userB)

	var row models.PrivateConversationRow
	err := r.DB.QueryRow(`
		SELECT id, user1_id, user2_id, created_at, updated_at
		FROM private_conversations
		WHERE user1_id = ? AND user2_id = ?
	`, u1, u2).Scan(&row.ID, &row.User1ID, &row.User2ID, &row.CreatedAt, &row.UpdatedAt)

	if err == nil {
		return row, nil
	}
	if err != sql.ErrNoRows {
		return models.PrivateConversationRow{}, err
	}

	newID := uuid.NewString()
	_, err = r.DB.Exec(`
		INSERT INTO private_conversations (id, user1_id, user2_id)
		VALUES (?, ?, ?)
	`, newID, u1, u2)
	if err != nil {
		return models.PrivateConversationRow{}, err
	}

	// Read back
	err = r.DB.QueryRow(`
		SELECT id, user1_id, user2_id, created_at, updated_at
		FROM private_conversations
		WHERE id = ?
	`, newID).Scan(&row.ID, &row.User1ID, &row.User2ID, &row.CreatedAt, &row.UpdatedAt)

	return row, err
}

// ListConversations returns both private and group conversations for a user.
func (r *Repo) ListConversations(userID string) ([]models.Conversation, error) {
	var out []models.Conversation

	// Private conversations
	rows, err := r.DB.Query(`
		SELECT pc.id,
			   CASE WHEN pc.user1_id = ? THEN pc.user2_id ELSE pc.user1_id END AS other_user_id,
			   u.first_name, u.last_name, u.avatar_url,
			   lm.content, lm.sender_id, su.first_name, su.last_name, lm.created_at,
			   COALESCE((SELECT COUNT(1) FROM private_messages pm WHERE pm.conversation_id = pc.id AND pm.receiver_id = ? AND pm.is_read = 0), 0) AS unread_count
		FROM private_conversations pc
		JOIN users u
		  ON u.id = (CASE WHEN pc.user1_id = ? THEN pc.user2_id ELSE pc.user1_id END)
		LEFT JOIN (
			SELECT pm1.conversation_id, pm1.content, pm1.sender_id, pm1.created_at
			FROM private_messages pm1
			JOIN (
				SELECT conversation_id, MAX(created_at) AS max_created_at
				FROM private_messages
				GROUP BY conversation_id
			) pm2
			ON pm1.conversation_id = pm2.conversation_id AND pm1.created_at = pm2.max_created_at
		) lm ON lm.conversation_id = pc.id
		LEFT JOIN users su ON su.id = lm.sender_id
		WHERE (pc.user1_id = ? OR pc.user2_id = ?)
		  AND (
			EXISTS (SELECT 1 FROM private_messages pmh WHERE pmh.conversation_id = pc.id)
			OR EXISTS (
				SELECT 1 FROM followers f
				WHERE f.status = 'accepted'
				  AND ((f.follower_id = pc.user1_id AND f.following_id = pc.user2_id)
				    OR (f.follower_id = pc.user2_id AND f.following_id = pc.user1_id))
			)
		  )
		ORDER BY COALESCE(lm.created_at, pc.updated_at) DESC
	`, userID, userID, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			convID, otherID string
			fn, ln          string
			avatar          sql.NullString
			lmContent       sql.NullString
			lmSenderID      sql.NullString
			sfn, sln        sql.NullString
			lmCreatedAt     sql.NullString
			unreadCount     int
		)
		if err := rows.Scan(&convID, &otherID, &fn, &ln, &avatar, &lmContent, &lmSenderID, &sfn, &sln, &lmCreatedAt, &unreadCount); err != nil {
			return nil, err
		}

		c := models.Conversation{
			ID:   convID,
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
			},
			UnreadCount: unreadCount,
		}
		if avatar.Valid {
			c.Participant.AvatarURL = &avatar.String
		}
		if lmContent.Valid && lmSenderID.Valid && lmCreatedAt.Valid {
			senderName := ""
			if sfn.Valid || sln.Valid {
				senderName = (sfn.String + " " + sln.String)
			}
			c.LastMessage = &struct {
				Content    string `json:"content"`
				SenderID   string `json:"senderId"`
				SenderName string `json:"senderName"`
				CreatedAt  string `json:"createdAt"`
			}{
				Content:    lmContent.String,
				SenderID:   lmSenderID.String,
				SenderName: senderName,
				CreatedAt:  lmCreatedAt.String,
			}
		}
		out = append(out, c)
	}

	// Group conversations: conversationId is "group:<groupId>"
	grows, err := r.DB.Query(`
		SELECT g.id, g.name, g.image_url,
			   (SELECT COUNT(1) FROM group_members gm2 WHERE gm2.group_id = g.id) AS member_count,
			   lm.content, lm.sender_id, su.first_name, su.last_name, lm.created_at,
			   (SELECT COUNT(1) FROM group_messages gm3
			    WHERE gm3.group_id = g.id
			      AND gm3.sender_id != ?
			      AND gm3.created_at > COALESCE(
			          (SELECT gmr.last_read_at FROM group_message_reads gmr WHERE gmr.group_id = g.id AND gmr.user_id = ?),
			          '1970-01-01'
			      )
			   ) AS unread_count
		FROM group_members gm
		JOIN groups g ON g.id = gm.group_id
		LEFT JOIN (
			SELECT gm1.group_id, gm1.content, gm1.sender_id, gm1.created_at
			FROM group_messages gm1
			JOIN (
				SELECT group_id, MAX(created_at) AS max_created_at
				FROM group_messages
				GROUP BY group_id
			) gm2
			ON gm1.group_id = gm2.group_id AND gm1.created_at = gm2.max_created_at
		) lm ON lm.group_id = g.id
		LEFT JOIN users su ON su.id = lm.sender_id
		WHERE gm.user_id = ?
		ORDER BY COALESCE(lm.created_at, g.created_at) DESC
	`, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer grows.Close()

	for grows.Next() {
		var (
			groupID, title string
			imageURL       sql.NullString
			memberCount    int
			lmContent      sql.NullString
			lmSenderID     sql.NullString
			sfn, sln       sql.NullString
			lmCreatedAt    sql.NullString
			groupUnread    int
		)
		if err := grows.Scan(&groupID, &title, &imageURL, &memberCount, &lmContent, &lmSenderID, &sfn, &sln, &lmCreatedAt, &groupUnread); err != nil {
			return nil, err
		}
		c := models.Conversation{
			ID:   "group:" + groupID,
			Type: "group",
			Group: &struct {
				GroupID     string  `json:"groupId"`
				Title       string  `json:"title"`
				ImageURL    *string `json:"imageUrl,omitempty"`
				MemberCount int     `json:"memberCount"`
			}{
				GroupID:     groupID,
				Title:       title,
				MemberCount: memberCount,
			},
			UnreadCount: groupUnread,
		}
		if imageURL.Valid && imageURL.String != "" {
			c.Group.ImageURL = &imageURL.String
		}
		if lmContent.Valid && lmSenderID.Valid && lmCreatedAt.Valid {
			senderName := ""
			if sfn.Valid || sln.Valid {
				senderName = (sfn.String + " " + sln.String)
			}
			c.LastMessage = &struct {
				Content    string `json:"content"`
				SenderID   string `json:"senderId"`
				SenderName string `json:"senderName"`
				CreatedAt  string `json:"createdAt"`
			}{
				Content:    lmContent.String,
				SenderID:   lmSenderID.String,
				SenderName: senderName,
				CreatedAt:  lmCreatedAt.String,
			}
		}
		out = append(out, c)
	}

	// Sort all conversations (private + group) by last message time, newest first
	sort.Slice(out, func(i, j int) bool {
		ti := lastMessageTime(out[i])
		tj := lastMessageTime(out[j])
		return ti > tj
	})

	return out, nil
}

func lastMessageTime(c models.Conversation) string {
	if c.LastMessage != nil {
		return c.LastMessage.CreatedAt
	}
	return ""
}

// GetConversationParticipants returns (user1_id, user2_id) for private conversation id.

func (r *Repo) ListGroupMemberIDs(groupID string) ([]string, error) {
	rows, err := r.DB.Query(`SELECT user_id FROM group_members WHERE group_id = ?`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var memberIDs []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		memberIDs = append(memberIDs, userID)
	}
	return memberIDs, rows.Err()
}

func (r *Repo) GetConversationParticipants(conversationID string) (string, string, error) {
	var u1, u2 string
	err := r.DB.QueryRow(`
		SELECT user1_id, user2_id FROM private_conversations WHERE id = ?
	`, conversationID).Scan(&u1, &u2)
	return u1, u2, err
}

func (r *Repo) PrivateConversationHasHistory(conversationID string) (bool, error) {
	var count int
	err := r.DB.QueryRow(`
		SELECT COUNT(1) FROM private_messages WHERE conversation_id = ?
	`, conversationID).Scan(&count)
	return count > 0, err
}

func (r *Repo) InsertPrivateMessage(conversationID, senderID, receiverID, content string) (string, string, int64, error) {
	id := uuid.NewString()
	_, err := r.DB.Exec(`
		INSERT INTO private_messages (id, conversation_id, sender_id, receiver_id, content)
		VALUES (?, ?, ?, ?, ?)
	`, id, conversationID, senderID, receiverID, content)
	if err != nil {
		return "", "", 0, err
	}

	var createdAt string
	var seq int64
	err = r.DB.QueryRow(`
		SELECT created_at, rowid
		FROM private_messages
		WHERE id = ?
	`, id).Scan(&createdAt, &seq)

	return id, createdAt, seq, err
}

func (r *Repo) InsertGroupMessage(groupID, senderID, content string) (string, string, int64, error) {
	id := uuid.NewString()
	_, err := r.DB.Exec(`
		INSERT INTO group_messages (id, group_id, sender_id, content)
		VALUES (?, ?, ?, ?)
	`, id, groupID, senderID, content)
	if err != nil {
		return "", "", 0, err
	}

	var createdAt string
	var seq int64
	err = r.DB.QueryRow(`
		SELECT created_at, rowid
		FROM group_messages
		WHERE id = ?
	`, id).Scan(&createdAt, &seq)

	return id, createdAt, seq, err
}

func (r *Repo) GetUserBasic(userID string) (firstName, lastName string, avatarURL *string, err error) {
	var avatar sql.NullString
	err = r.DB.QueryRow(`SELECT first_name, last_name, avatar_url FROM users WHERE id = ?`, userID).Scan(&firstName, &lastName, &avatar)
	if err != nil {
		return "", "", nil, err
	}
	if avatar.Valid {
		avatarURL = &avatar.String
	}
	return firstName, lastName, avatarURL, nil
}

func (r *Repo) GetPrivateMessages(conversationID string, limit int, offset int) ([]models.ChatMessage, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := r.DB.Query(`
		SELECT pm.id, pm.conversation_id, pm.sender_id, pm.content, pm.created_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM private_messages pm
		JOIN users u ON u.id = pm.sender_id
		WHERE pm.conversation_id = ?
		ORDER BY pm.created_at DESC, pm.rowid DESC
		LIMIT ? OFFSET ?
	`, conversationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tmp []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		var avatar sql.NullString
		if err := rows.Scan(
			&m.ID,
			&m.ConversationID,
			&m.SenderID,
			&m.Content,
			&m.CreatedAt,
			&m.Sender.FirstName,
			&m.Sender.LastName,
			&avatar,
		); err != nil {
			return nil, err
		}
		if avatar.Valid {
			m.Sender.AvatarURL = &avatar.String
		}
		tmp = append(tmp, m)
	}

	for i, j := 0, len(tmp)-1; i < j; i, j = i+1, j-1 {
		tmp[i], tmp[j] = tmp[j], tmp[i]
	}
	return tmp, nil
}

func (r *Repo) GetGroupMessages(groupID string, limit int, offset int) ([]models.ChatMessage, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := r.DB.Query(`
		SELECT gm.id, gm.group_id, gm.sender_id, gm.content, gm.created_at,
		       u.first_name, u.last_name, u.avatar_url
		FROM group_messages gm
		JOIN users u ON u.id = gm.sender_id
		WHERE gm.group_id = ?
		ORDER BY gm.created_at DESC, gm.rowid DESC
		LIMIT ? OFFSET ?
	`, groupID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tmp []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		var scannedGroupID string
		var avatar sql.NullString

		if err := rows.Scan(
			&m.ID,
			&scannedGroupID,
			&m.SenderID,
			&m.Content,
			&m.CreatedAt,
			&m.Sender.FirstName,
			&m.Sender.LastName,
			&avatar,
		); err != nil {
			return nil, err
		}

		m.ConversationID = "group:" + scannedGroupID
		if avatar.Valid {
			m.Sender.AvatarURL = &avatar.String
		}
		tmp = append(tmp, m)
	}

	for i, j := 0, len(tmp)-1; i < j; i, j = i+1, j-1 {
		tmp[i], tmp[j] = tmp[j], tmp[i]
	}
	return tmp, nil
}

// ListEligiblePrivateUserIDs returns user IDs that the given user can chat with
// according to the project rule: at least one accepted follow exists in either direction.
func (r *Repo) ListEligiblePrivateUserIDs(userID string) ([]string, error) {
	rows, err := r.DB.Query(`
		SELECT DISTINCT
			CASE
				WHEN follower_id = ? THEN following_id
				ELSE follower_id
			END AS other_user_id
		FROM followers
		WHERE status = 'accepted'
		  AND (follower_id = ? OR following_id = ?)
	`, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []string
	for rows.Next() {
		var other string
		if err := rows.Scan(&other); err != nil {
			return nil, err
		}
		if other != "" && other != userID {
			out = append(out, other)
		}
	}
	return out, rows.Err()
}

func orderPair(a, b string) (string, string) {
	if a < b {
		return a, b
	}
	return b, a
}

// TouchConversation updates updated_at (useful when a new message arrives).
func (r *Repo) TouchConversation(conversationID string) {
	r.DB.Exec(`UPDATE private_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, conversationID)
	_ = time.Now()
}

// CountUnreadMessages returns total unread private messages for a user.
func (r *Repo) CountUnreadMessages(userID string) (int, error) {
	var count int
	err := r.DB.QueryRow(`
		SELECT COUNT(1) FROM private_messages
		WHERE receiver_id = ? AND is_read = 0
	`, userID).Scan(&count)
	return count, err
}

// CountUnreadInConversation returns unread count for a specific conversation and user.
func (r *Repo) CountUnreadInConversation(conversationID, userID string) (int, error) {
	var count int
	err := r.DB.QueryRow(`
		SELECT COUNT(1) FROM private_messages
		WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0
	`, conversationID, userID).Scan(&count)
	return count, err
}

// MarkConversationRead marks all messages in a conversation as read for the given user.
func (r *Repo) MarkConversationRead(conversationID, userID string) error {
	_, err := r.DB.Exec(`
		UPDATE private_messages SET is_read = 1
		WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0
	`, conversationID, userID)
	return err
}

// MarkGroupConversationRead updates the last_read_at timestamp for a user in a group.
func (r *Repo) MarkGroupConversationRead(groupID, userID string) error {
	_, err := r.DB.Exec(`
		INSERT INTO group_message_reads (group_id, user_id, last_read_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(group_id, user_id) DO UPDATE SET last_read_at = CURRENT_TIMESTAMP
	`, groupID, userID)
	return err
}
