package models

import (
	"database/sql"
	"time"
)

// User represents a user in the system
type User struct {
	ID          string         `json:"id"`
	Email       string         `json:"email"`
	Password    string         `json:"-"` // Never sent to client
	FirstName   string         `json:"firstName"`
	LastName    string         `json:"lastName"`
	DateOfBirth string         `json:"dateOfBirth"`
	Username    string         `json:"username"`
	Nickname    sql.NullString `json:"nickname,omitempty"`
	AboutMe     sql.NullString `json:"aboutMe,omitempty"`
	AvatarURL   sql.NullString `json:"avatarUrl,omitempty"`
	BannerURL   sql.NullString `json:"bannerUrl,omitempty"`
	IsPublic    bool           `json:"isPublic"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}

// UserResponse is the JSON response for user data
type UserResponse struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	FirstName   string  `json:"firstName"`
	LastName    string  `json:"lastName"`
	DateOfBirth string  `json:"dateOfBirth"`
	Username    string  `json:"username"`
	Nickname    *string `json:"nickname"`
	AboutMe     *string `json:"aboutMe"`
	AvatarURL   *string `json:"avatarUrl"`
	BannerURL   *string `json:"bannerUrl"`
	IsPublic    bool    `json:"isPublic"`
}

// UserProfileResponse includes social stats
type UserProfileResponse struct {
	ID                string  `json:"id"`
	Email             string  `json:"email"`
	FirstName         string  `json:"firstName"`
	LastName          string  `json:"lastName"`
	DateOfBirth       string  `json:"dateOfBirth"`
	Username          string  `json:"username"`
	Nickname          *string `json:"nickname"`
	AboutMe           *string `json:"aboutMe"`
	AvatarURL         *string `json:"avatarUrl"`
	BannerURL         *string `json:"bannerUrl"`
	IsPublic          bool    `json:"isPublic"`
	FollowersCount    int     `json:"followersCount"`
	FollowingCount    int     `json:"followingCount"`
	PostsCount        int     `json:"postsCount"`
	ActivitiesCount   int     `json:"activitiesCount"`
	IsFollowedByMe    bool    `json:"isFollowedByMe"`
	IsFollowRequested bool    `json:"isFollowRequested"`
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:          u.ID,
		Email:       u.Email,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		DateOfBirth: u.DateOfBirth,
		Username:    u.Username,
		Nickname:    nullStringToPtr(u.Nickname),
		AboutMe:     nullStringToPtr(u.AboutMe),
		AvatarURL:   nullStringToPtr(u.AvatarURL),
		BannerURL:   nullStringToPtr(u.BannerURL),
		IsPublic:    u.IsPublic,
	}
}

// ToProfileResponse converts User to UserProfileResponse with stats
func (u *User) ToProfileResponse(followersCount, followingCount, postsCount, activitiesCount int, isFollowedByMe, isFollowRequested bool) UserProfileResponse {
	return UserProfileResponse{
		ID:                u.ID,
		Email:             u.Email,
		FirstName:         u.FirstName,
		LastName:          u.LastName,
		DateOfBirth:       u.DateOfBirth,
		Username:          u.Username,
		Nickname:          nullStringToPtr(u.Nickname),
		AboutMe:           nullStringToPtr(u.AboutMe),
		AvatarURL:         nullStringToPtr(u.AvatarURL),
		BannerURL:         nullStringToPtr(u.BannerURL),
		IsPublic:          u.IsPublic,
		FollowersCount:    followersCount,
		FollowingCount:    followingCount,
		PostsCount:        postsCount,
		ActivitiesCount:   activitiesCount,
		IsFollowedByMe:    isFollowedByMe,
		IsFollowRequested: isFollowRequested,
	}
}

// nullStringToPtr converts sql.NullString to *string
func nullStringToPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

// FollowUser represents a user in follower/following lists
type FollowUser struct {
	ID        string  `json:"id"`
	FirstName string  `json:"firstName"`
	LastName  string  `json:"lastName"`
	Username  string  `json:"username"`
	AvatarURL *string `json:"avatarUrl"`
}

// Author represents minimal author info for posts/comments
type Author struct {
	FirstName string  `json:"firstName"`
	LastName  string  `json:"lastName"`
	AvatarURL *string `json:"avatarUrl"`
}
