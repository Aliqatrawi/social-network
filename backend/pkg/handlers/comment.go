package handlers

import (
	"database/sql"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/models"
	"social-network/backend/pkg/utils"
	"social-network/backend/pkg/ws"
)

var (
	commentHubMu sync.RWMutex
	commentHub   *ws.Hub
)

func SetCommentHub(hub *ws.Hub) {
	commentHubMu.Lock()
	defer commentHubMu.Unlock()
	commentHub = hub
}

func getCommentHub() *ws.Hub {
	commentHubMu.RLock()
	defer commentHubMu.RUnlock()
	return commentHub
}

// CommentHandler handles comment-related routes
type CommentHandler struct {
	db *sql.DB
}

// NewCommentHandler creates a new comment handler
func NewCommentHandler(db *sql.DB) *CommentHandler {
	return &CommentHandler{db: db}
}

// CreateComment creates a new comment on a post
func (h *CommentHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	postID := r.PathValue("postId")
	if postID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post ID is required")
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	content := strings.TrimSpace(r.FormValue("content"))

	// Check if post exists and user has permission to comment
	var privacyLevel string
	var postUserID string
	var groupID sql.NullString
	err := h.db.QueryRow(`SELECT user_id, privacy_level, group_id FROM posts WHERE id = ?`, postID).Scan(&postUserID, &privacyLevel, &groupID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Post not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create comment")
		}
		return
	}

	// Check permissions - user must be able to see the post to comment
	canComment := false

	// If post is a group post, check group membership
	if groupID.Valid {
		var memberCount int
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID.String, user.ID).Scan(&memberCount); err != nil {
			log.Printf("Failed to check group membership for group %s user %s: %v", groupID.String, user.ID, err)
		} else {
			log.Printf("Group membership check for group %s user %s: count=%d", groupID.String, user.ID, memberCount)
		}
		canComment = memberCount > 0
		if !canComment {
			log.Printf("User %s not a member of group %s for comment on post %s", user.ID, groupID.String, postID)
		}
	} else {
		// Regular post permissions
		log.Printf("Post %s is not a group post, using regular permissions", postID)
		if privacyLevel == string(models.PrivacyPublic) {
			canComment = true
		} else if user.ID == postUserID {
			canComment = true
		} else if privacyLevel == string(models.PrivacyAlmostPrivate) {
			// Check if user follows the post author
			var count int
			if err := h.db.QueryRow(`SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = ? AND status = 'accepted'`, user.ID, postUserID).Scan(&count); err != nil {
				log.Printf("Failed to check follower status for comment on post %s: %v", postID, err)
			}
			canComment = count > 0
		} else if privacyLevel == string(models.PrivacyPrivate) {
			// Check if user is in the post's visibility list
			var count int
			if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_visibility WHERE post_id = ? AND user_id = ?`, postID, user.ID).Scan(&count); err != nil {
				log.Printf("Failed to check post visibility for comment on post %s: %v", postID, err)
			}
			canComment = count > 0
		}
	}

	if !canComment {
		utils.ErrorResponse(w, http.StatusForbidden, "You don't have permission to comment on this post")
		return
	}

	// Handle optional image upload
	var imageURLPtr *string
	imageURL := sql.NullString{}
	file, header, fileErr := r.FormFile("image")
	if fileErr == nil {
		defer file.Close()

		// Validate file type
		contentType := header.Header.Get("Content-Type")
		if !isValidUploadType(contentType) {
			utils.ErrorResponse(w, http.StatusBadRequest, "Invalid image type. Only JPEG, PNG, GIF, and WebP are allowed")
			return
		}

		// Create uploads directory
		uploadDir := "./uploads/images"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save image")
			return
		}

		// Generate unique filename
		ext := filepath.Ext(header.Filename)
		if ext == "" {
			ext = getExtensionFromContentType(contentType)
		}
		filename := uuid.New().String() + ext
		filePath := filepath.Join(uploadDir, filename)

		// Save file
		dst, err := os.Create(filePath)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save image")
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save image")
			return
		}

		url := "/uploads/images/" + filename
		imageURL.String = url
		imageURL.Valid = true
		imageURLPtr = &url
	}

	if content == "" && !imageURL.Valid {
		utils.ErrorResponse(w, http.StatusBadRequest, "Comment must include text or an image")
		return
	}

	if len(content) > 1000 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Comment must be 1000 characters or less")
		return
	}

	commentID := uuid.New().String()

	_, err = h.db.Exec(`
		INSERT INTO comments (id, post_id, user_id, content, image_url)
		VALUES (?, ?, ?, ?, ?)
	`, commentID, postID, user.ID, content, imageURL)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create comment")
		return
	}

	now := time.Now()
	userResp := user.ToResponse()
	comment := models.CommentResponse{
		ID:        commentID,
		PostID:    postID,
		UserID:    user.ID,
		Author:    &userResp,
		Content:   content,
		ImageURL:  imageURLPtr,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Notify post owner about the comment (don't notify yourself)
	if postUserID != user.ID {
		notifHandler := NewNotificationHandler(h.db)
		// Remove any existing comment notification from this user on this post, then create new
		h.db.Exec(`
			DELETE FROM notifications
			WHERE user_id = ? AND related_user_id = ? AND type = 'comment' AND post_id = ?
		`, postUserID, user.ID, postID)

		notifHandler.CreateNotification(
			postUserID,
			models.NotificationComment,
			"New comment",
			user.FirstName+" "+user.LastName+" commented on your post",
			user.ID,
			"",
			"",
			postID,
		)
	}

	// Broadcast group event via WebSocket if it's a group post (exclude commenting user)
	if groupID.Valid && groupID.String != "" {
		if hub := getCommentHub(); hub != nil {
			msg := ws.OutgoingMessage{
				Type: "group_event",
				Payload: map[string]interface{}{
					"type":      "comment_added",
					"groupId":   groupID.String,
					"timestamp": now.Unix(),
					"data": map[string]interface{}{
						"postId":  postID,
						"comment": comment,
					},
				},
			}
			hub.BroadcastExclude(msg, user.ID)
		}
	}

	utils.JSONResponse(w, http.StatusCreated, comment)
}

// GetComments retrieves comments for a post
func (h *CommentHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("postId")
	if postID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post ID is required")
		return
	}

	currentUser := middleware.GetUserFromContext(r)

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

	// Check if post exists and user has permission
	var privacyLevel string
	var postUserID string
	var groupID sql.NullString
	err := h.db.QueryRow(`SELECT user_id, privacy_level, group_id FROM posts WHERE id = ?`, postID).Scan(&postUserID, &privacyLevel, &groupID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Post not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch comments")
		}
		return
	}

	// Check permissions
	canViewComments := false

	// If post is a group post, check group membership
	if groupID.Valid {
		if currentUser != nil {
			var memberCount int
			if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID.String, currentUser.ID).Scan(&memberCount); err != nil {
				log.Printf("Failed to check group membership for comments on post %s: %v", postID, err)
			}
			canViewComments = memberCount > 0
			log.Printf("Group post %s - group membership check: %d members", postID, memberCount)
		}
	} else {
		// Regular post permissions
		if privacyLevel == string(models.PrivacyPublic) {
			canViewComments = true
			log.Printf("Post %s is public", postID)
		} else if currentUser != nil && currentUser.ID == postUserID {
			canViewComments = true
			log.Printf("Post %s owner viewing their own post", postID)
		} else if privacyLevel == string(models.PrivacyAlmostPrivate) && currentUser != nil {
			// Check if user follows the post author
			var count int
			if err := h.db.QueryRow(`SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = ? AND status = 'accepted'`, currentUser.ID, postUserID).Scan(&count); err != nil {
				log.Printf("Failed to check follower status for comments on post %s: %v", postID, err)
			}
			canViewComments = count > 0
			log.Printf("Post %s followers-only - follower check: count=%d", postID, count)
		} else if privacyLevel == string(models.PrivacyPrivate) && currentUser != nil {
			// Check if user is in the post's visibility list
			var count int
			if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_visibility WHERE post_id = ? AND user_id = ?`, postID, currentUser.ID).Scan(&count); err != nil {
				log.Printf("Failed to check post visibility for comments on post %s: %v", postID, err)
			}
			canViewComments = count > 0
			log.Printf("Post %s private - visibility check: count=%d", postID, count)
		}
	}

	if !canViewComments {
		utils.ErrorResponse(w, http.StatusForbidden, "You don't have permission to view comments on this post")
		return
	}

	rows, err := h.db.Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, COALESCE(c.image_url, ''), 
		       c.created_at, c.updated_at
		FROM comments c
		WHERE c.post_id = ?
		ORDER BY c.created_at DESC
		LIMIT ? OFFSET ?
	`, postID, limit, offset)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch comments")
		return
	}
	defer rows.Close()

	var comments []models.CommentResponse
	for rows.Next() {
		var comment models.CommentResponse
		var imageURL string

		if err := rows.Scan(&comment.ID, &comment.PostID, &comment.UserID, &comment.Content,
			&imageURL, &comment.CreatedAt, &comment.UpdatedAt); err != nil {
			continue
		}

		if imageURL != "" {
			comment.ImageURL = &imageURL
		}

		// Get user info
		var commentUser models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, comment.UserID).Scan(
			&commentUser.ID, &commentUser.Email, &commentUser.FirstName, &commentUser.LastName,
			&commentUser.DateOfBirth, &commentUser.Username, &commentUser.Nickname, &commentUser.AboutMe,
			&commentUser.AvatarURL, &commentUser.BannerURL, &commentUser.IsPublic,
			&commentUser.CreatedAt, &commentUser.UpdatedAt); err != nil {
			log.Printf("Failed to fetch user info for comment %s: %v", comment.ID, err)
			continue
		}

		userResp := commentUser.ToResponse()
		comment.Author = &userResp

		comments = append(comments, comment)
	}

	if comments == nil {
		comments = []models.CommentResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, comments)
}

// DeleteComment deletes a comment (only owner can delete)
func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	commentID := r.PathValue("commentId")
	if commentID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Comment ID is required")
		return
	}

	// Check if user owns the comment
	var ownerID string
	err := h.db.QueryRow(`SELECT user_id FROM comments WHERE id = ?`, commentID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Comment not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete comment")
		}
		return
	}

	if ownerID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "You can only delete your own comments")
		return
	}

	_, err = h.db.Exec(`DELETE FROM comments WHERE id = ?`, commentID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete comment")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Comment deleted successfully"})
}
