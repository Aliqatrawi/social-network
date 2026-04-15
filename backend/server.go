package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"social-network/backend/pkg/chat"
	"social-network/backend/pkg/db/sqlite"
	"social-network/backend/pkg/handlers"
	"social-network/backend/pkg/middleware"
	"social-network/backend/pkg/ws"
)

func main() {
	// Initialize database
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./social_network.db"
	}
	db, err := sqlite.InitDB(dbPath)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Run migrations
	if err := sqlite.RunMigrations(db, "file://pkg/db/migrations/sqlite"); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	log.Println("Database initialized and migrations applied successfully")

	// Create uploads directory if it doesn't exist
	os.MkdirAll("./uploads/avatars", 0755)
	os.MkdirAll("./uploads/images", 0755)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db)
	userHandler := handlers.NewUserHandler(db)
	followHandler := handlers.NewFollowHandler(db)
	uploadHandler := handlers.NewUploadHandler()
	postHandler := handlers.NewPostHandler(db)
	commentHandler := handlers.NewCommentHandler(db)
	groupHandler := handlers.NewGroupHandler(db)
	eventHandler := handlers.NewEventHandler(db)
	notificationHandler := handlers.NewNotificationHandler(db)

	// Chat + WebSocket (member4)
	chatHandler := chat.NewHandler(db)
	wsHub := ws.NewHub()
	wsThrottler := ws.NewThrottler(20, 5*time.Second)
	wsHandler := ws.NewHandler(db, wsHub, wsThrottler)
	handlers.SetNotificationHub(wsHub)
	handlers.SetPostHub(wsHub)
	handlers.SetCommentHub(wsHub)

	// Create router
	mux := http.NewServeMux()

	// Health check / root endpoint (use Handle for exact match)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","message":"Social Network API is running"}`))
	})

	// Serve static files (uploads)
	fileServer := http.FileServer(http.Dir("./uploads"))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fileServer))

	// Auth routes (no auth required)
	mux.HandleFunc("POST /api/register", authHandler.Register)
	mux.HandleFunc("POST /api/login", authHandler.Login)
	mux.HandleFunc("POST /api/logout", middleware.RequireAuth(db, authHandler.Logout))

	// Current user route
	mux.HandleFunc("GET /api/me", middleware.RequireAuth(db, userHandler.GetCurrentUser))

	// User routes
	mux.HandleFunc("GET /api/user/{userId}", middleware.RequireAuth(db, userHandler.GetUser))
	mux.HandleFunc("PUT /api/user/profile", middleware.RequireAuth(db, userHandler.UpdateProfile))
	mux.HandleFunc("GET /api/users", middleware.RequireAuth(db, userHandler.GetAllUsers))

	// Search route
	mux.HandleFunc("GET /api/search", middleware.RequireAuth(db, userHandler.Search))

	// Follow routes
	mux.HandleFunc("GET /api/user/{userId}/followers", middleware.RequireAuth(db, followHandler.GetFollowers))
	mux.HandleFunc("GET /api/user/{userId}/following", middleware.RequireAuth(db, followHandler.GetFollowing))
	mux.HandleFunc("POST /api/user/{userId}/follow", middleware.RequireAuth(db, followHandler.Follow))
	mux.HandleFunc("DELETE /api/user/{userId}/follow", middleware.RequireAuth(db, followHandler.Unfollow))

	// Follow request routes
	mux.HandleFunc("GET /api/follow-requests", middleware.RequireAuth(db, followHandler.GetPendingRequests))
	mux.HandleFunc("GET /api/follow-requests/sent", middleware.RequireAuth(db, followHandler.GetMyPendingRequests))
	mux.HandleFunc("POST /api/follow-requests/{requesterId}/accept", middleware.RequireAuth(db, followHandler.AcceptFollowRequest))
	mux.HandleFunc("POST /api/follow-requests/{requesterId}/decline", middleware.RequireAuth(db, followHandler.DeclineFollowRequest))
	mux.HandleFunc("DELETE /api/follow-requests/{userId}/cancel", middleware.RequireAuth(db, followHandler.CancelFollowRequest))

	// Upload route
	mux.HandleFunc("POST /api/upload", middleware.RequireAuth(db, uploadHandler.Upload))

	// Post routes
	mux.HandleFunc("POST /api/posts", middleware.RequireAuth(db, postHandler.CreatePost))
	mux.HandleFunc("GET /api/posts", middleware.RequireAuth(db, postHandler.GetPosts))
	mux.HandleFunc("GET /api/feed", middleware.RequireAuth(db, postHandler.GetPosts))
	mux.HandleFunc("GET /api/posts/{postId}", middleware.RequireAuth(db, postHandler.GetPost))
	mux.HandleFunc("GET /api/users/{userId}/posts", middleware.RequireAuth(db, postHandler.GetUserPosts))
	mux.HandleFunc("GET /api/user/{userId}/posts", middleware.RequireAuth(db, postHandler.GetUserPosts))
	mux.HandleFunc("GET /api/user/{userId}/activities", middleware.RequireAuth(db, postHandler.GetUserActivities))
	mux.HandleFunc("POST /api/posts/{postId}/react", middleware.RequireAuth(db, postHandler.ReactToPost))
	mux.HandleFunc("DELETE /api/posts/{postId}", middleware.RequireAuth(db, postHandler.DeletePost))
	mux.HandleFunc("GET /api/tags/popular", middleware.RequireAuth(db, postHandler.GetPopularTags))

	// Comment routes
	mux.HandleFunc("POST /api/posts/{postId}/comments", middleware.RequireAuth(db, commentHandler.CreateComment))
	mux.HandleFunc("GET /api/posts/{postId}/comments", middleware.RequireAuth(db, commentHandler.GetComments))
	mux.HandleFunc("DELETE /api/comments/{commentId}", middleware.RequireAuth(db, commentHandler.DeleteComment))

	// Group routes
	mux.HandleFunc("POST /api/groups", middleware.RequireAuth(db, groupHandler.CreateGroup))
	mux.HandleFunc("GET /api/groups", middleware.RequireAuth(db, groupHandler.GetGroups))
	mux.HandleFunc("GET /api/groups/my", middleware.RequireAuth(db, groupHandler.GetMyGroups))
	mux.HandleFunc("GET /api/groups/{groupId}", middleware.RequireAuth(db, groupHandler.GetGroup))
	mux.HandleFunc("POST /api/groups/{groupId}/invite", middleware.RequireAuth(db, groupHandler.InviteUser))
	mux.HandleFunc("POST /api/groups/{groupId}/accept-invitation", middleware.RequireAuth(db, groupHandler.AcceptGroupInvitation))
	mux.HandleFunc("POST /api/groups/{groupId}/decline-invitation", middleware.RequireAuth(db, groupHandler.DeclineGroupInvitation))
	mux.HandleFunc("POST /api/groups/{groupId}/join", middleware.RequireAuth(db, groupHandler.RequestToJoinGroup))
	mux.HandleFunc("DELETE /api/groups/{groupId}/join", middleware.RequireAuth(db, groupHandler.CancelJoinRequest))
	mux.HandleFunc("POST /api/groups/{groupId}/leave", middleware.RequireAuth(db, groupHandler.LeaveGroup))
	mux.HandleFunc("GET /api/groups/{groupId}/members", middleware.RequireAuth(db, groupHandler.GetGroupMembers))
	mux.HandleFunc("DELETE /api/groups/{groupId}/members/{memberId}", middleware.RequireAuth(db, groupHandler.KickMember))
	mux.HandleFunc("GET /api/groups/{groupId}/join-requests", middleware.RequireAuth(db, groupHandler.GetGroupJoinRequests))
	mux.HandleFunc("POST /api/groups/{groupId}/join-requests/{requestId}/accept", middleware.RequireAuth(db, groupHandler.AcceptJoinRequest))
	mux.HandleFunc("POST /api/groups/{groupId}/join-requests/{requestId}/decline", middleware.RequireAuth(db, groupHandler.DeclineJoinRequest))

	// Group post routes
	mux.HandleFunc("POST /api/groups/{groupId}/posts", middleware.RequireAuth(db, postHandler.CreateGroupPost))
	mux.HandleFunc("GET /api/groups/{groupId}/posts", middleware.RequireAuth(db, postHandler.GetGroupPosts))

	// Event routes
	mux.HandleFunc("POST /api/groups/{groupId}/events", middleware.RequireAuth(db, eventHandler.CreateEvent))
	mux.HandleFunc("GET /api/groups/{groupId}/events", middleware.RequireAuth(db, eventHandler.GetGroupEvents))
	mux.HandleFunc("POST /api/events/{eventId}/rsvp", middleware.RequireAuth(db, eventHandler.RSVPEvent))
	mux.HandleFunc("GET /api/events/{eventId}/respondents", middleware.RequireAuth(db, eventHandler.GetEventRespondents))

	// Notification routes
	mux.HandleFunc("GET /api/notifications", middleware.RequireAuth(db, notificationHandler.GetNotifications))
	mux.HandleFunc("GET /api/notifications/unread-count", middleware.RequireAuth(db, notificationHandler.GetUnreadNotificationCount))
	mux.HandleFunc("PUT /api/notifications/{notificationId}/read", middleware.RequireAuth(db, notificationHandler.MarkNotificationAsRead))
	mux.HandleFunc("PUT /api/notifications/read-all", middleware.RequireAuth(db, notificationHandler.MarkAllNotificationsAsRead))
	mux.HandleFunc("DELETE /api/notifications/{notificationId}", middleware.RequireAuth(db, notificationHandler.DeleteNotification))

	// Chat routes (member4)
	mux.HandleFunc("GET /api/chat/conversations", middleware.RequireAuth(db, chatHandler.GetConversations))
	mux.HandleFunc("POST /api/chat/conversations/private/{userId}", middleware.RequireAuth(db, chatHandler.GetOrCreatePrivateConversation))
	mux.HandleFunc("GET /api/chat/conversations/{conversationId}/messages", middleware.RequireAuth(db, chatHandler.GetConversationMessages))
	mux.HandleFunc("POST /api/chat/messages", middleware.RequireAuth(db, chatHandler.SendMessage))
	mux.HandleFunc("GET /api/chat/unread-count", middleware.RequireAuth(db, chatHandler.GetUnreadCount))
	mux.HandleFunc("PUT /api/chat/conversations/{conversationId}/read", middleware.RequireAuth(db, chatHandler.MarkConversationRead))

	// WebSocket endpoint (member4)
	mux.HandleFunc("GET /ws", wsHandler.ServeWS)

	// Apply CORS middleware
	handler := middleware.CORS(mux)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s...\n", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
