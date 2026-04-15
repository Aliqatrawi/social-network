package handlers

import (
	"database/sql"
	"encoding/json"
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
	postHubMu sync.RWMutex
	postHub   *ws.Hub
)

func SetPostHub(hub *ws.Hub) {
	postHubMu.Lock()
	defer postHubMu.Unlock()
	postHub = hub
}

func getPostHub() *ws.Hub {
	postHubMu.RLock()
	defer postHubMu.RUnlock()
	return postHub
}

// PostHandler handles post-related routes
type PostHandler struct {
	db *sql.DB
}

// NewPostHandler creates a new post handler
func NewPostHandler(db *sql.DB) *PostHandler {
	return &PostHandler{db: db}
}

// CreatePost creates a new post
func (h *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	content := strings.TrimSpace(r.FormValue("content"))
	privacyLevel := models.PrivacyLevel(r.FormValue("privacy"))

	if content == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post content is required")
		return
	}

	if len(title) > 100 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post title must be 100 characters or less")
		return
	}

	if len(content) > 5000 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post content must be 5000 characters or less")
		return
	}

	// Validate privacy level
	if privacyLevel != models.PrivacyPublic &&
		privacyLevel != models.PrivacyAlmostPrivate &&
		privacyLevel != models.PrivacyPrivate {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid privacy level")
		return
	}

	// Handle optional image upload
	var imageURLPtr *string
	imageURL := sql.NullString{}
	file, header, err := r.FormFile("image")
	if err == nil {
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

	postID := uuid.New().String()

	// Begin transaction
	tx, err := h.db.Begin()
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create post")
		return
	}
	defer tx.Rollback()

	// Create post
	contentFormat := r.FormValue("content_format")
	if contentFormat == "" {
		contentFormat = "plain"
	}

	_, err = tx.Exec(`
		INSERT INTO posts (id, user_id, title, content, image_url, privacy_level, content_format)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, postID, user.ID, title, content, imageURL, privacyLevel, contentFormat)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create post")
		return
	}

	// Parse and insert tags
	var tags []string
	if tagsStr := r.FormValue("tags"); tagsStr != "" {
		if err := json.Unmarshal([]byte(tagsStr), &tags); err != nil {
			log.Printf("Failed to parse tags JSON: %v", err)
		}
	}
	for _, tag := range tags {
		tag = strings.TrimSpace(strings.ToLower(tag))
		if tag == "" {
			continue
		}
		if _, err := tx.Exec(`INSERT OR IGNORE INTO post_tags (post_id, tag) VALUES (?, ?)`, postID, tag); err != nil {
			log.Printf("Failed to insert tag %q for post %s: %v", tag, postID, err)
		}
	}

	// If private, add selected followers visibility
	if privacyLevel == models.PrivacyPrivate {
		// Parse selected followers from form (JSON array string)
		selectedFollowersStr := r.FormValue("selectedFollowers")
		if selectedFollowersStr != "" {
			// Simple parsing: split comma-separated IDs or JSON array
			var followerIDs []string
			for _, id := range strings.Split(strings.Trim(selectedFollowersStr, "[]\""), ",") {
				id = strings.Trim(strings.TrimSpace(id), "\"")
				if id != "" {
					followerIDs = append(followerIDs, id)
				}
			}
			for _, followerID := range followerIDs {
				visibilityID := uuid.New().String()
				_, err := tx.Exec(`
					INSERT INTO post_visibility (id, post_id, user_id)
					VALUES (?, ?, ?)
				`, visibilityID, postID, followerID)
				if err != nil {
					log.Printf("Failed to add post visibility for follower %s: %v", followerID, err)
					continue
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create post")
		return
	}

	now := time.Now()
	userResp := user.ToResponse()
	post := models.PostResponse{
		ID:            postID,
		UserID:        user.ID,
		Author:        &userResp,
		Title:         title,
		Content:       content,
		ImageURL:      imageURLPtr,
		Privacy:       privacyLevel,
		CommentCount:  0,
		Tags:          cleanTags(tags),
		ContentFormat: contentFormat,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Broadcast new post to all connected users (except the author)
	if hub := getPostHub(); hub != nil {
		msg := ws.OutgoingMessage{
			Type: "feed_update",
			Payload: map[string]interface{}{
				"action": "post_created",
				"post":   post,
			},
		}
		hub.BroadcastExclude(msg, user.ID)
	}

	utils.JSONResponse(w, http.StatusCreated, post)
}

// GetPost retrieves a single post
func (h *PostHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("postId")
	if postID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post ID is required")
		return
	}

	currentUser := middleware.GetUserFromContext(r)

	post, err := h.getPostWithPermission(postID, currentUser)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Post not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch post")
		}
		return
	}

	if post == nil {
		utils.ErrorResponse(w, http.StatusForbidden, "You don't have permission to view this post")
		return
	}

	// Get comment count
	var commentCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, postID).Scan(&commentCount); err != nil {
		log.Printf("Failed to fetch comment count for post %s: %v", postID, err)
	}
	post.CommentCount = commentCount

	utils.JSONResponse(w, http.StatusOK, post)
}

// GetPosts retrieves posts for the feed
func (h *PostHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

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

	// Optional tag filter
	tagFilter := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("tag")))

	// Get posts user can see (exclude group posts from main feed)
	// Privacy logic:
	//   public         → visible to everyone
	//   own posts      → always visible to author
	//   almost_private → visible to accepted followers of the post author
	//   private        → visible to author + users listed in post_visibility
	query := `
		SELECT
			p.id, p.user_id, p.title, p.content, COALESCE(p.image_url, ''),
			p.privacy_level, COALESCE(p.content_format, 'plain'), p.created_at, p.updated_at
		FROM posts p
		WHERE p.group_id IS NULL AND (
			p.privacy_level = ?
			OR p.user_id = ?
			OR (p.privacy_level = ? AND EXISTS (
				SELECT 1 FROM followers
				WHERE follower_id = ? AND following_id = p.user_id AND status = 'accepted'
			))
			OR (p.privacy_level = ? AND EXISTS (
				SELECT 1 FROM post_visibility
				WHERE post_id = p.id AND user_id = ?
			))
		)`
	args := []interface{}{models.PrivacyPublic, currentUser.ID, models.PrivacyAlmostPrivate,
		currentUser.ID, models.PrivacyPrivate, currentUser.ID}

	if tagFilter != "" {
		query += ` AND EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag = ?)`
		args = append(args, tagFilter)
	}

	query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch posts")
		return
	}
	defer rows.Close()

	var posts []models.PostResponse
	for rows.Next() {
		var post models.PostResponse
		var id, userID, title, content, imageURL, privacyLevel, contentFormat string

		if err := rows.Scan(&id, &userID, &title, &content, &imageURL, &privacyLevel, &contentFormat, &post.CreatedAt, &post.UpdatedAt); err != nil {
			continue
		}

		post.ID = id
		post.UserID = userID
		post.Title = title
		post.Content = content
		post.Privacy = models.PrivacyLevel(privacyLevel)
		post.ContentFormat = contentFormat

		if imageURL != "" {
			post.ImageURL = &imageURL
		}

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
			log.Printf("Failed to fetch user info for post %s: %v", id, err)
			continue
		}

		userResp := user.ToResponse()
		post.Author = &userResp
		post.Tags = h.loadPostTags(id)

		// Get comment count
		var commentCount int
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, id).Scan(&commentCount); err != nil {
			log.Printf("Failed to fetch comment count for post %s: %v", id, err)
		}
		post.CommentCount = commentCount

		// Get reaction counts
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'like'`, id).Scan(&post.LikeCount); err != nil {
			log.Printf("Failed to fetch like count for post %s: %v", id, err)
		}
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'dislike'`, id).Scan(&post.DislikeCount); err != nil {
			log.Printf("Failed to fetch dislike count for post %s: %v", id, err)
		}
		var userReaction string
		if err := h.db.QueryRow(`SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?`, id, currentUser.ID).Scan(&userReaction); err == nil {
			post.UserReaction = &userReaction
		}

		posts = append(posts, post)
	}

	if posts == nil {
		posts = []models.PostResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, posts)
}

// GetUserPosts retrieves posts from a specific user
func (h *PostHandler) GetUserPosts(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	if userID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

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

	// Get user info
	var user models.User
	err := h.db.QueryRow(`
		SELECT id, email, first_name, last_name, date_of_birth, 
			   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
		FROM users WHERE id = ?
	`, userID).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.DateOfBirth, &user.Username, &user.Nickname, &user.AboutMe,
		&user.AvatarURL, &user.BannerURL, &user.IsPublic,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		utils.ErrorResponse(w, http.StatusNotFound, "User not found")
		return
	}

	// Build query based on permission
	query := ""
	args := []interface{}{}

	if currentUser != nil && currentUser.ID == userID {
		// User viewing their own posts (all posts, excluding group posts)
		query = `
			SELECT id, user_id, title, content, COALESCE(image_url, ''),
				   privacy_level, COALESCE(content_format, 'plain'), created_at, updated_at
			FROM posts
			WHERE user_id = ? AND group_id IS NULL
			ORDER BY created_at DESC
			LIMIT ? OFFSET ?
		`
		args = []interface{}{userID, limit, offset}
	} else if user.IsPublic {
		// Viewing public user's posts (public only, excluding group posts)
		query = `
			SELECT id, user_id, title, content, COALESCE(image_url, ''),
				   privacy_level, COALESCE(content_format, 'plain'), created_at, updated_at
			FROM posts
			WHERE user_id = ? AND privacy_level = ? AND group_id IS NULL
			ORDER BY created_at DESC
			LIMIT ? OFFSET ?
		`
		args = []interface{}{userID, models.PrivacyPublic, limit, offset}
	} else {
		// Viewing private user's posts
		if currentUser != nil {
			query = `
				SELECT id, user_id, title, content, COALESCE(image_url, ''),
					   privacy_level, created_at, updated_at
				FROM posts
				WHERE user_id = ? AND group_id IS NULL AND (
					privacy_level = ?
					OR (privacy_level = ? AND EXISTS (
						SELECT 1 FROM followers
						WHERE follower_id = ? AND following_id = posts.user_id AND status = 'accepted'
					))
				)
				ORDER BY created_at DESC
				LIMIT ? OFFSET ?
			`
			args = []interface{}{userID, models.PrivacyPublic, models.PrivacyAlmostPrivate, currentUser.ID, limit, offset}
		} else {
			query = `
				SELECT id, user_id, title, content, COALESCE(image_url, ''),
					   privacy_level, created_at, updated_at
				FROM posts
				WHERE user_id = ? AND privacy_level = ? AND group_id IS NULL
				ORDER BY created_at DESC
				LIMIT ? OFFSET ?
			`
			args = []interface{}{userID, models.PrivacyPublic, limit, offset}
		}
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch posts")
		return
	}
	defer rows.Close()

	var posts []models.PostResponse
	for rows.Next() {
		var post models.PostResponse
		var id, userID, title, content, imageURL, privacyLevel, contentFormat string

		if err := rows.Scan(&id, &userID, &title, &content, &imageURL, &privacyLevel, &contentFormat, &post.CreatedAt, &post.UpdatedAt); err != nil {
			continue
		}

		post.ID = id
		post.UserID = userID
		post.Title = title
		post.Content = content
		post.Privacy = models.PrivacyLevel(privacyLevel)
		post.ContentFormat = contentFormat

		if imageURL != "" {
			post.ImageURL = &imageURL
		}

		userResp := user.ToResponse()
		post.Author = &userResp
		post.Tags = h.loadPostTags(id)

		// Get comment count
		var commentCount int
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, id).Scan(&commentCount); err != nil {
			log.Printf("Failed to fetch comment count for post %s: %v", id, err)
		}
		post.CommentCount = commentCount

		// Get reaction counts
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'like'`, id).Scan(&post.LikeCount); err != nil {
			log.Printf("Failed to fetch like count for post %s: %v", id, err)
		}
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'dislike'`, id).Scan(&post.DislikeCount); err != nil {
			log.Printf("Failed to fetch dislike count for post %s: %v", id, err)
		}
		if currentUser != nil {
			var userReaction string
			if err := h.db.QueryRow(`SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?`, id, currentUser.ID).Scan(&userReaction); err == nil {
				post.UserReaction = &userReaction
			}
		}

		posts = append(posts, post)
	}

	if posts == nil {
		posts = []models.PostResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, posts)
}

// DeletePost deletes a post (only owner can delete)
func (h *PostHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
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

	// Check if user owns the post and get groupId
	var ownerID string
	var groupID sql.NullString
	err := h.db.QueryRow(`SELECT user_id, group_id FROM posts WHERE id = ?`, postID).Scan(&ownerID, &groupID)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Post not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete post")
		}
		return
	}

	if ownerID != user.ID {
		utils.ErrorResponse(w, http.StatusForbidden, "You can only delete your own posts")
		return
	}

	// Delete post (cascades to post_visibility and comments)
	_, err = h.db.Exec(`DELETE FROM posts WHERE id = ?`, postID)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to delete post")
		return
	}

	// Broadcast group event via WebSocket if it's a group post (exclude deleting user)
	if groupID.Valid && groupID.String != "" {
		if hub := getPostHub(); hub != nil {
			msg := ws.OutgoingMessage{
				Type: "group_event",
				Payload: map[string]interface{}{
					"type":      "post_deleted",
					"groupId":   groupID.String,
					"timestamp": time.Now().Unix(),
					"data": map[string]interface{}{
						"postId": postID,
					},
				},
			}
			hub.BroadcastExclude(msg, user.ID)
		}
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Post deleted successfully"})
}

// Helper function to get post with permission check
func (h *PostHandler) getPostWithPermission(postID string, currentUser *models.User) (*models.PostResponse, error) {
	var post models.PostResponse
	var userID, privacyLevel, imageURL string

	var contentFormat string
	err := h.db.QueryRow(`
		SELECT id, user_id, title, content, COALESCE(image_url, ''),
		       privacy_level, COALESCE(content_format, 'plain'), created_at, updated_at
		FROM posts WHERE id = ?
	`, postID).Scan(&post.ID, &userID, &post.Title, &post.Content, &imageURL, &privacyLevel, &contentFormat, &post.CreatedAt, &post.UpdatedAt)

	if err != nil {
		return nil, err
	}

	post.UserID = userID
	post.Privacy = models.PrivacyLevel(privacyLevel)
	post.ContentFormat = contentFormat
	if imageURL != "" {
		post.ImageURL = &imageURL
	}

	// Check permissions
	if privacyLevel == string(models.PrivacyPublic) {
		// Public post - anyone can see
	} else if currentUser != nil && userID == currentUser.ID {
		// User's own post
	} else if privacyLevel == string(models.PrivacyAlmostPrivate) && currentUser != nil {
		// Check if current user follows the post author
		var count int
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = ? AND status = 'accepted'`, currentUser.ID, userID).Scan(&count); err != nil {
			log.Printf("Failed to check follower status for post %s: %v", postID, err)
			return nil, nil
		}
		if count == 0 {
			return nil, nil
		}
	} else if privacyLevel == string(models.PrivacyPrivate) && currentUser != nil {
		// Private post - check if user is author or in post_visibility
		if userID != currentUser.ID {
			var visCount int
			if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_visibility WHERE post_id = ? AND user_id = ?`, postID, currentUser.ID).Scan(&visCount); err != nil || visCount == 0 {
				return nil, nil
			}
		}
	} else {
		return nil, nil
	}

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
		log.Printf("Failed to fetch user info for post author %s: %v", userID, err)
	}

	userResp := user.ToResponse()
	post.Author = &userResp
	post.Tags = h.loadPostTags(postID)

	// Get reaction counts
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'like'`, postID).Scan(&post.LikeCount); err != nil {
		log.Printf("Failed to fetch like count for post %s: %v", postID, err)
	}
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'dislike'`, postID).Scan(&post.DislikeCount); err != nil {
		log.Printf("Failed to fetch dislike count for post %s: %v", postID, err)
	}
	if currentUser != nil {
		var userReaction string
		if err := h.db.QueryRow(`SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?`, postID, currentUser.ID).Scan(&userReaction); err == nil {
			post.UserReaction = &userReaction
		}
	}

	return &post, nil
}

// CreateGroupPost creates a post in a group (for group members only)
func (h *PostHandler) CreateGroupPost(w http.ResponseWriter, r *http.Request) {
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

	// Check if user is member of group
	var memberCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID).Scan(&memberCount); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}
	if memberCount == 0 {
		utils.ErrorResponse(w, http.StatusForbidden, "You are not a member of this group")
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	content := strings.TrimSpace(r.FormValue("content"))

	// Handle optional image upload
	var imageURLPtr *string
	imageURL := sql.NullString{}
	file, header, err := r.FormFile("image")
	if err == nil {
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
		utils.ErrorResponse(w, http.StatusBadRequest, "Post must include content or an image")
		return
	}

	if len(content) > 5000 {
		utils.ErrorResponse(w, http.StatusBadRequest, "Post content must be 5000 characters or less")
		return
	}

	postID := uuid.New().String()

	contentFormat := r.FormValue("content_format")
	if contentFormat == "" {
		contentFormat = "plain"
	}

	_, err = h.db.Exec(`
		INSERT INTO posts (id, user_id, title, content, image_url, privacy_level, group_id, content_format)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, postID, user.ID, title, content, imageURL, "group", groupID, contentFormat)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create post")
		return
	}

	now := time.Now()
	userResp := user.ToResponse()
	post := models.PostResponse{
		ID:            postID,
		UserID:        user.ID,
		Author:        &userResp,
		Title:         title,
		Content:       content,
		ImageURL:      imageURLPtr,
		Privacy:       "group",
		GroupID:       &groupID,
		CommentCount:  0,
		Tags:          []string{},
		ContentFormat: contentFormat,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Broadcast group event via WebSocket (exclude creating user - they get it via callback)
	if hub := getPostHub(); hub != nil {
		msg := ws.OutgoingMessage{
			Type: "group_event",
			Payload: map[string]interface{}{
				"type":      "post_created",
				"groupId":   groupID,
				"timestamp": now.Unix(),
				"data": map[string]interface{}{
					"post": post,
				},
			},
		}
		hub.BroadcastExclude(msg, user.ID)
	}

	utils.JSONResponse(w, http.StatusCreated, post)
}

// GetGroupPosts retrieves posts from a group (members only)
func (h *PostHandler) GetGroupPosts(w http.ResponseWriter, r *http.Request) {
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

	// Check if user is member of group
	var memberCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`, groupID, user.ID).Scan(&memberCount); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}
	if memberCount == 0 {
		utils.ErrorResponse(w, http.StatusForbidden, "You are not a member of this group")
		return
	}

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
		SELECT
			p.id, p.user_id, p.title, p.content, COALESCE(p.image_url, ''),
			p.privacy_level, COALESCE(p.content_format, 'plain'), p.created_at, p.updated_at
		FROM posts p
		WHERE p.group_id = ?
		ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?
	`, groupID, limit, offset)

	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch posts")
		return
	}
	defer rows.Close()

	var posts []models.PostResponse
	for rows.Next() {
		var post models.PostResponse
		var id, userID, title, content, imageURL, privacyLevel, contentFormat string

		if err := rows.Scan(&id, &userID, &title, &content, &imageURL, &privacyLevel, &contentFormat, &post.CreatedAt, &post.UpdatedAt); err != nil {
			continue
		}

		post.ID = id
		post.UserID = userID
		post.Title = title
		post.Content = content
		post.Privacy = models.PrivacyLevel(privacyLevel)
		post.ContentFormat = contentFormat

		if imageURL != "" {
			post.ImageURL = &imageURL
		}

		// Get user info
		var postUser models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
				   username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, userID).Scan(
			&postUser.ID, &postUser.Email, &postUser.FirstName, &postUser.LastName,
			&postUser.DateOfBirth, &postUser.Username, &postUser.Nickname, &postUser.AboutMe,
			&postUser.AvatarURL, &postUser.BannerURL, &postUser.IsPublic,
			&postUser.CreatedAt, &postUser.UpdatedAt); err != nil {
			log.Printf("Failed to fetch user info for group post %s: %v", id, err)
			continue
		}

		userResp := postUser.ToResponse()
		post.Author = &userResp
		post.Tags = h.loadPostTags(id)

		// Get comment count
		var commentCount int
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, id).Scan(&commentCount); err != nil {
			log.Printf("Failed to fetch comment count for group post %s: %v", id, err)
		}
		post.CommentCount = commentCount

		// Get reaction counts
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'like'`, id).Scan(&post.LikeCount); err != nil {
			log.Printf("Failed to fetch like count for group post %s: %v", id, err)
		}
		if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'dislike'`, id).Scan(&post.DislikeCount); err != nil {
			log.Printf("Failed to fetch dislike count for group post %s: %v", id, err)
		}
		var groupUserReaction string
		if err := h.db.QueryRow(`SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?`, id, user.ID).Scan(&groupUserReaction); err == nil {
			post.UserReaction = &groupUserReaction
		}

		posts = append(posts, post)
	}

	if posts == nil {
		posts = []models.PostResponse{}
	}

	utils.JSONResponse(w, http.StatusOK, posts)
}

// ReactToPost handles liking/disliking a post (toggle behavior)
func (h *PostHandler) ReactToPost(w http.ResponseWriter, r *http.Request) {
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

	// Parse JSON body
	var req struct {
		Reaction string `json:"reaction"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Reaction != "like" && req.Reaction != "dislike" {
		utils.ErrorResponse(w, http.StatusBadRequest, "Reaction must be 'like' or 'dislike'")
		return
	}

	// Check if post exists and get owner
	var postUserID string
	if err := h.db.QueryRow(`SELECT user_id FROM posts WHERE id = ?`, postID).Scan(&postUserID); err != nil {
		if err == sql.ErrNoRows {
			utils.ErrorResponse(w, http.StatusNotFound, "Post not found")
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to check post")
		}
		return
	}

	notifHandler := NewNotificationHandler(h.db)
	syncReactionNotification := func(reaction string) {
		if postUserID == user.ID {
			return
		}

		_, err := h.db.Exec(`
			DELETE FROM notifications
			WHERE user_id = ? AND related_user_id = ? AND type IN ('like', 'dislike') AND post_id = ?
		`, postUserID, user.ID, postID)
		if err != nil {
			log.Printf("Failed to clear old reaction notifications for post %s: %v", postID, err)
		}

		switch reaction {
		case "like":
			if err := notifHandler.CreateNotification(
				postUserID,
				models.NotificationLike,
				"New like",
				user.FirstName+" "+user.LastName+" liked your post",
				user.ID,
				"",
				"",
				postID,
			); err != nil {
				log.Printf("Failed to create like notification for post %s: %v", postID, err)
			}
		case "dislike":
			if err := notifHandler.CreateNotification(
				postUserID,
				models.NotificationDislike,
				"New dislike",
				user.FirstName+" "+user.LastName+" disliked your post",
				user.ID,
				"",
				"",
				postID,
			); err != nil {
				log.Printf("Failed to create dislike notification for post %s: %v", postID, err)
			}
		}
	}

	clearReactionNotification := func() {
		if postUserID == user.ID {
			return
		}
		_, err := h.db.Exec(`
			DELETE FROM notifications
			WHERE user_id = ? AND related_user_id = ? AND type IN ('like', 'dislike') AND post_id = ?
		`, postUserID, user.ID, postID)
		if err != nil {
			log.Printf("Failed to clear reaction notifications for post %s: %v", postID, err)
		}
	}

	// Check if user already has a reaction on this post
	var existingReaction string
	err := h.db.QueryRow(`SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?`, postID, user.ID).Scan(&existingReaction)

	if err == sql.ErrNoRows {
		// No existing reaction — insert new one
		reactionID := uuid.New().String()
		_, err = h.db.Exec(`
			INSERT INTO post_reactions (id, post_id, user_id, reaction)
			VALUES (?, ?, ?, ?)
		`, reactionID, postID, user.ID, req.Reaction)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save reaction")
			return
		}

		syncReactionNotification(req.Reaction)
	} else if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to check reaction")
		return
	} else if existingReaction == req.Reaction {
		// Same reaction — toggle off (remove)
		_, err = h.db.Exec(`DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?`, postID, user.ID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to remove reaction")
			return
		}

		clearReactionNotification()
	} else {
		// Different reaction — update
		_, err = h.db.Exec(`UPDATE post_reactions SET reaction = ? WHERE post_id = ? AND user_id = ?`, req.Reaction, postID, user.ID)
		if err != nil {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to update reaction")
			return
		}

		syncReactionNotification(req.Reaction)
	}

	// Get updated counts
	var likeCount, dislikeCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'like'`, postID).Scan(&likeCount); err != nil {
		log.Printf("Failed to count likes for post %s: %v", postID, err)
	}
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'dislike'`, postID).Scan(&dislikeCount); err != nil {
		log.Printf("Failed to count dislikes for post %s: %v", postID, err)
	}

	// Get user's current reaction (may be nil if toggled off)
	var userReaction *string
	var currentReaction string
	err = h.db.QueryRow(`SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?`, postID, user.ID).Scan(&currentReaction)
	if err == nil {
		userReaction = &currentReaction
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"likeCount":    likeCount,
		"dislikeCount": dislikeCount,
		"userReaction": userReaction,
	})
}

// GetUserActivities returns a user's activity feed (posts they created + posts they commented on)
func (h *PostHandler) GetUserActivities(w http.ResponseWriter, r *http.Request) {
	targetUserID := r.PathValue("userId")
	if targetUserID == "" {
		utils.ErrorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	currentUser := middleware.GetUserFromContext(r)
	if currentUser == nil {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	type ActivityItem struct {
		ID        string              `json:"id"`
		Type      string              `json:"type"`
		Label     string              `json:"label"`
		Timestamp time.Time           `json:"timestamp"`
		Post      models.PostResponse `json:"post"`
	}

	var activities []ActivityItem
	seenPostIDs := map[string]bool{}

	// Helper to build a full PostResponse from a post row
	buildPost := func(id, userID, title, content, imageURL, privacyLevel, contentFormat string, groupID sql.NullString, createdAt, updatedAt time.Time) *models.PostResponse {
		post := models.PostResponse{
			ID:            id,
			UserID:        userID,
			Title:         title,
			Content:       content,
			Privacy:       models.PrivacyLevel(privacyLevel),
			ContentFormat: contentFormat,
			Tags:          []string{},
			CreatedAt:     createdAt,
			UpdatedAt:     updatedAt,
		}
		if imageURL != "" {
			post.ImageURL = &imageURL
		}
		if groupID.Valid {
			post.GroupID = &groupID.String
		}

		// Get author info
		var author models.User
		if err := h.db.QueryRow(`
			SELECT id, email, first_name, last_name, date_of_birth,
			       username, nickname, about_me, avatar_url, banner_url, is_public, created_at, updated_at
			FROM users WHERE id = ?
		`, userID).Scan(
			&author.ID, &author.Email, &author.FirstName, &author.LastName,
			&author.DateOfBirth, &author.Username, &author.Nickname, &author.AboutMe,
			&author.AvatarURL, &author.BannerURL, &author.IsPublic,
			&author.CreatedAt, &author.UpdatedAt); err != nil {
			log.Printf("Failed to fetch author for activity post %s: %v", id, err)
			return nil
		}
		authorResp := author.ToResponse()
		post.Author = &authorResp

		// Comment count
		h.db.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, id).Scan(&post.CommentCount)

		// Reaction counts
		h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'like'`, id).Scan(&post.LikeCount)
		h.db.QueryRow(`SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'dislike'`, id).Scan(&post.DislikeCount)
		var ur string
		if h.db.QueryRow(`SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?`, id, currentUser.ID).Scan(&ur) == nil {
			post.UserReaction = &ur
		}

		return &post
	}

	// 1) Get user's own posts as "posted" activities
	postRows, err := h.db.Query(`
		SELECT p.id, p.user_id, p.title, p.content, COALESCE(p.image_url, ''),
		       p.privacy_level, COALESCE(p.content_format, 'plain'), p.group_id, p.created_at, p.updated_at
		FROM posts p
		WHERE p.user_id = ? AND p.group_id IS NULL AND (
			p.privacy_level = 'public'
			OR p.user_id = ?
			OR (p.privacy_level = 'almost_private' AND EXISTS (
				SELECT 1 FROM followers
				WHERE follower_id = ? AND following_id = p.user_id AND status = 'accepted'
			))
			OR (p.privacy_level = 'private' AND EXISTS (
				SELECT 1 FROM post_visibility
				WHERE post_id = p.id AND user_id = ?
			))
		)
		ORDER BY p.created_at DESC
		LIMIT 20
	`, targetUserID, currentUser.ID, currentUser.ID, currentUser.ID)

	if err != nil {
		log.Printf("Failed to fetch user posts for activities: %v", err)
	} else {
		defer postRows.Close()
		for postRows.Next() {
			var id, userID, title, content, imageURL, privacyLevel, contentFormat string
			var groupID sql.NullString
			var createdAt, updatedAt time.Time

			if err := postRows.Scan(&id, &userID, &title, &content, &imageURL, &privacyLevel, &contentFormat, &groupID, &createdAt, &updatedAt); err != nil {
				log.Printf("Failed to scan post row for activities: %v", err)
				continue
			}

			post := buildPost(id, userID, title, content, imageURL, privacyLevel, contentFormat, groupID, createdAt, updatedAt)
			if post == nil {
				continue
			}

			seenPostIDs[id] = true
			activities = append(activities, ActivityItem{
				ID:        "posted-" + id,
				Type:      "posted",
				Label:     "Shared a post",
				Timestamp: createdAt,
				Post:      *post,
			})
		}
	}

	// 2) Get posts the user commented on as "commented" activities
	// Use a simple query: get all comments by the target user, ordered by date
	commentRows, err := h.db.Query(`
		SELECT c.post_id, c.created_at
		FROM comments c
		JOIN posts p ON p.id = c.post_id
		WHERE c.user_id = ? AND p.group_id IS NULL AND (
			p.privacy_level = 'public'
			OR p.user_id = ?
			OR (p.privacy_level = 'almost_private' AND EXISTS (
				SELECT 1 FROM followers
				WHERE follower_id = ? AND following_id = p.user_id AND status = 'accepted'
			))
			OR (p.privacy_level = 'private' AND EXISTS (
				SELECT 1 FROM post_visibility
				WHERE post_id = p.id AND user_id = ?
			))
		)
		ORDER BY c.created_at DESC
		LIMIT 50
	`, targetUserID, currentUser.ID, currentUser.ID, currentUser.ID)

	if err != nil {
		log.Printf("Failed to fetch user comments for activities: %v", err)
	} else {
		defer commentRows.Close()
		for commentRows.Next() {
			var postID string
			var commentedAt time.Time
			if err := commentRows.Scan(&postID, &commentedAt); err != nil {
				log.Printf("Failed to scan comment row for activities: %v", err)
				continue
			}

			// Skip if we already have this post (as "posted" or an earlier comment)
			if seenPostIDs[postID] {
				continue
			}
			seenPostIDs[postID] = true

			// Fetch the post
			var pID, pUserID, pTitle, pContent, pImageURL, pPrivacy, pContentFormat string
			var pGroupID sql.NullString
			var pCreatedAt, pUpdatedAt time.Time
			if err := h.db.QueryRow(`
				SELECT id, user_id, title, content, COALESCE(image_url, ''),
				       privacy_level, COALESCE(content_format, 'plain'), group_id, created_at, updated_at
				FROM posts WHERE id = ?
			`, postID).Scan(&pID, &pUserID, &pTitle, &pContent, &pImageURL, &pPrivacy, &pContentFormat, &pGroupID, &pCreatedAt, &pUpdatedAt); err != nil {
				log.Printf("Failed to fetch post %s for comment activity: %v", postID, err)
				continue
			}

			post := buildPost(pID, pUserID, pTitle, pContent, pImageURL, pPrivacy, pContentFormat, pGroupID, pCreatedAt, pUpdatedAt)
			if post == nil {
				continue
			}

			activities = append(activities, ActivityItem{
				ID:        "commented-" + postID,
				Type:      "commented",
				Label:     "Commented on a post",
				Timestamp: commentedAt,
				Post:      *post,
			})
		}
	}

	// Sort activities by timestamp descending
	for i := 0; i < len(activities); i++ {
		for j := i + 1; j < len(activities); j++ {
			if activities[j].Timestamp.After(activities[i].Timestamp) {
				activities[i], activities[j] = activities[j], activities[i]
			}
		}
	}

	// Limit to 20
	if len(activities) > 20 {
		activities = activities[:20]
	}

	if activities == nil {
		activities = []ActivityItem{}
	}

	utils.JSONResponse(w, http.StatusOK, activities)
}

// cleanTags ensures the returned slice is never nil (JSON: [] not null).
func cleanTags(tags []string) []string {
	if tags == nil {
		return []string{}
	}
	return tags
}

// loadPostTags fetches tags for a single post from the post_tags table.
func (h *PostHandler) loadPostTags(postID string) []string {
	rows, err := h.db.Query(`SELECT tag FROM post_tags WHERE post_id = ?`, postID)
	if err != nil {
		return []string{}
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var tag string
		if rows.Scan(&tag) == nil {
			tags = append(tags, tag)
		}
	}
	return cleanTags(tags)
}

// GetPopularTags returns the most-used tags across all posts.
func (h *PostHandler) GetPopularTags(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
		limit = l
	}

	rows, err := h.db.Query(`
		SELECT tag, COUNT(*) AS cnt
		FROM post_tags
		GROUP BY tag
		ORDER BY cnt DESC
		LIMIT ?
	`, limit)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to fetch tags")
		return
	}
	defer rows.Close()

	type TagCount struct {
		Tag   string `json:"tag"`
		Count int    `json:"count"`
	}
	var tags []TagCount
	for rows.Next() {
		var tc TagCount
		if rows.Scan(&tc.Tag, &tc.Count) == nil {
			tags = append(tags, tc)
		}
	}
	if tags == nil {
		tags = []TagCount{}
	}
	utils.JSONResponse(w, http.StatusOK, tags)
}
