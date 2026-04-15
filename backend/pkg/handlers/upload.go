package handlers

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"social-network/backend/pkg/utils"

	"github.com/google/uuid"
)

// UploadHandler handles file upload routes
type UploadHandler struct{}

// NewUploadHandler creates a new upload handler
func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

// Upload handles file uploads
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	// Get file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "No file provided")
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !isValidUploadType(contentType) {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed")
		return
	}

	// Create uploads directory
	uploadDir := "./uploads/images"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to create upload directory")
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = getExtensionFromContentType(contentType)
	}
	filename := uuid.New().String() + ext
	filePath := filepath.Join(uploadDir, filename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	// Return the URL
	url := "/uploads/images/" + filename
	utils.JSONResponse(w, http.StatusOK, map[string]string{"url": url})
}

// isValidUploadType checks if the content type is allowed
func isValidUploadType(contentType string) bool {
	validTypes := []string{
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
	}
	for _, t := range validTypes {
		if strings.EqualFold(contentType, t) {
			return true
		}
	}
	return false
}

// getExtensionFromContentType returns file extension based on content type
func getExtensionFromContentType(contentType string) string {
	switch strings.ToLower(contentType) {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".bin"
	}
}
