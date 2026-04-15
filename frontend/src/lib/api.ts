const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === "true";

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
      ...options,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        error: data?.error || data?.message || "Something went wrong",
        status: response.status,
      };
    }

    return { data: data as T, status: response.status };
  } catch {
    return {
      error: "Unable to connect to server",
      status: 0,
    };
  }
}

// Auth endpoints
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  username: string;
  nickname?: string;
  aboutMe?: string;
  avatar?: File;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  username: string;
  aboutMe?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPublic: boolean;
}

export async function loginUser(_payload: LoginPayload) {
  if (DEV_AUTH) {
    const { getMockLogin } = await import("./mock-data");
    return getMockLogin();
  }
  return apiClient<User>("/api/login", {
    method: "POST",
    body: JSON.stringify(_payload),
  });
}

export async function registerUser(payload: RegisterPayload) {
  // Use FormData for file upload support
  const formData = new FormData();
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("firstName", payload.firstName);
  formData.append("lastName", payload.lastName);
  formData.append("dateOfBirth", payload.dateOfBirth);

  formData.append("username", payload.username);
  if (payload.nickname) formData.append("nickname", payload.nickname);
  if (payload.aboutMe) formData.append("aboutMe", payload.aboutMe);
  if (payload.avatar) formData.append("avatar", payload.avatar);

  return apiClient<User>("/api/register", {
    method: "POST",
    body: formData,
    headers: {}, // Let browser set Content-Type for FormData
  });
}

export async function logoutUser() {
  if (DEV_AUTH) {
    const { getMockLogout } = await import("./mock-data");
    return getMockLogout();
  }
  return apiClient("/api/logout", {
    method: "POST",
  });
}

export async function getCurrentUser() {
  if (DEV_AUTH) {
    const { getMockCurrentUser } = await import("./mock-data");
    return getMockCurrentUser();
  }
  return apiClient<User>("/api/me");
}

// ---- Profile ----

export interface ProfileResponse extends User {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  activitiesCount: number;
  isFollowedByMe: boolean;
  isFollowRequested: boolean;
}

export async function getUserProfile(userId: string) {
  if (DEV_AUTH) {
    const { getMockProfile } = await import("./mock-data");
    return getMockProfile(userId);
  }
  return apiClient<ProfileResponse>(`/api/user/${userId}`);
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  aboutMe?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPublic?: boolean;
}

export async function updateProfile(data: UpdateProfilePayload) {
  if (DEV_AUTH) {
    const { getMockUpdateProfile } = await import("./mock-data");
    return getMockUpdateProfile(data);
  }
  return apiClient<User>("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function uploadFile(file: File) {
  if (DEV_AUTH) {
    const { getMockUploadFile } = await import("./mock-data");
    return getMockUploadFile(file);
  }
  const formData = new FormData();
  formData.append("file", file);
  return apiClient<{ url: string }>("/api/upload", {
    method: "POST",
    body: formData,
    headers: {},
  });
}

// ---- Posts ----

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  imageUrl?: string;
  privacy: "public" | "almost_private" | "private";
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  tags?: string[];
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
  userReaction: "like" | "dislike" | null;
  contentFormat?: "plain" | "html";
}

export interface ReactionResponse {
  likeCount: number;
  dislikeCount: number;
  userReaction: "like" | "dislike" | null;
}

export interface CreatePostPayload {
  title: string;
  content: string;
  privacy: "public" | "almost_private" | "private";
  image?: File;
  tags?: string[];
  contentFormat?: "plain" | "html";
  selectedFollowers?: string[];
}

export async function getFeedPosts(params?: { limit?: number; offset?: number; tag?: string }) {
  if (DEV_AUTH) {
    const { getMockFeedPosts } = await import("./mock-data");
    return getMockFeedPosts();
  }
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.tag) query.set("tag", params.tag);
  const qs = query.toString();
  return apiClient<Post[]>(`/api/feed${qs ? `?${qs}` : ""}`);
}

export interface PopularTag {
  tag: string;
  count: number;
}

export async function getPopularTags(limit = 10) {
  return apiClient<PopularTag[]>(`/api/tags/popular?limit=${limit}`);
}

export async function createPost(payload: CreatePostPayload) {
  if (DEV_AUTH) {
    const { getMockCreatePost } = await import("./mock-data");
    return getMockCreatePost(payload);
  }
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("content", payload.content);
  formData.append("privacy", payload.privacy);
  formData.append("content_format", payload.contentFormat || "plain");
  if (payload.image) formData.append("image", payload.image);
  if (payload.tags?.length) formData.append("tags", JSON.stringify(payload.tags));
  if (payload.selectedFollowers?.length) formData.append("selectedFollowers", JSON.stringify(payload.selectedFollowers));

  return apiClient<Post>("/api/posts", {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export async function deletePost(postId: string) {
  if (DEV_AUTH) {
    const { getMockDeletePost } = await import("./mock-data");
    return getMockDeletePost(postId);
  }
  return apiClient(`/api/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function reactToPost(
  postId: string,
  reaction: "like" | "dislike",
) {
  if (DEV_AUTH) {
    const { getMockReactToPost } = await import("./mock-data");
    return getMockReactToPost(postId, reaction);
  }
  return apiClient<ReactionResponse>(`/api/posts/${postId}/react`, {
    method: "POST",
    body: JSON.stringify({ reaction }),
  });
}

export async function getUserPosts(userId: string) {
  if (DEV_AUTH) {
    const { getMockUserPosts } = await import("./mock-data");
    return getMockUserPosts(userId);
  }
  return apiClient<Post[]>(`/api/user/${userId}/posts`);
}

// ---- Comments ----

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export interface CreateCommentPayload {
  postId: string;
  content: string;
  image?: File;
}

export async function getPostComments(postId: string) {
  if (DEV_AUTH) {
    const { getMockPostComments } = await import("./mock-data");
    return getMockPostComments(postId);
  }
  return apiClient<Comment[]>(`/api/posts/${postId}/comments`);
}

export async function createComment(payload: CreateCommentPayload) {
  if (DEV_AUTH) {
    const { getMockCreateComment } = await import("./mock-data");
    return getMockCreateComment(payload);
  }
  const formData = new FormData();
  formData.append("content", payload.content);
  if (payload.image) formData.append("image", payload.image);

  return apiClient<Comment>(`/api/posts/${payload.postId}/comments`, {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export async function deleteComment(commentId: string) {
  if (DEV_AUTH) {
    const { getMockDeleteComment } = await import("./mock-data");
    return getMockDeleteComment(commentId);
  }
  return apiClient(`/api/comments/${commentId}`, {
    method: "DELETE",
  });
}

// ---- Followers / Following ----

export interface FollowUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl?: string;
}

export async function getUserFollowers(userId: string) {
  if (DEV_AUTH) {
    const { getMockFollowers } = await import("./mock-data");
    return getMockFollowers(userId);
  }
  return apiClient<FollowUser[]>(`/api/user/${userId}/followers`);
}

export async function getUserFollowing(userId: string) {
  if (DEV_AUTH) {
    const { getMockFollowing } = await import("./mock-data");
    return getMockFollowing(userId);
  }
  return apiClient<FollowUser[]>(`/api/user/${userId}/following`);
}

export async function followUser(userId: string) {
  if (DEV_AUTH) {
    const { getMockFollowAction } = await import("./mock-data");
    return getMockFollowAction(userId);
  }
  return apiClient<{ status: string }>(`/api/user/${userId}/follow`, {
    method: "POST",
  });
}

export async function unfollowUser(userId: string) {
  if (DEV_AUTH) {
    const { getMockUnfollowAction } = await import("./mock-data");
    return getMockUnfollowAction();
  }
  return apiClient(`/api/user/${userId}/follow`, {
    method: "DELETE",
  });
}

export async function cancelFollowRequest(userId: string) {
  if (DEV_AUTH) {
    const { getMockCancelFollowRequest } = await import("./mock-data");
    return getMockCancelFollowRequest(userId);
  }
  return apiClient(`/api/follow-requests/${userId}/cancel`, {
    method: "DELETE",
  });
}

// ---- Activities ----

export interface ActivityItem {
  id: string;
  type: "posted" | "commented" | "reposted";
  label: string;
  timestamp: string;
  post: Post;
}

export async function getUserActivities(userId: string) {
  if (DEV_AUTH) {
    const { getMockUserActivities } = await import("./mock-data");
    return getMockUserActivities(userId);
  }
  return apiClient<ActivityItem[]>(`/api/user/${userId}/activities`);
}

// ---- Notifications ----

export type NotificationType =
  | "follow_request"
  | "follow_accepted"
  | "new_follower"
  | "comment"
  | "like"
  | "dislike"
  | "group_invitation"
  | "group_join_request"
  | "group_event"
  | "group_kicked"
  | "group_member_left"
  | "group_join_accepted"
  | "group_invitation_declined";

export interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  actorId: string;
  actor: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  isRead: boolean;
  actionPending: boolean;
  createdAt: string;
  metadata?: {
    postId?: string;
    postTitle?: string;
    commentId?: string;
    groupId?: string;
    groupName?: string;
    eventId?: string;
    eventTitle?: string;
  };
}

export async function getNotifications(params?: { limit?: number; offset?: number }) {
  if (DEV_AUTH) {
    const { getMockNotifications } = await import("./mock-data");
    return getMockNotifications();
  }
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return apiClient<Notification[]>(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export async function getUnreadNotificationCount() {
  if (DEV_AUTH) {
    const { getMockUnreadCount } = await import("./mock-data");
    return getMockUnreadCount();
  }
  return apiClient<{ count: number }>("/api/notifications/unread-count");
}

export async function markNotificationRead(notificationId: string) {
  if (DEV_AUTH) {
    const { getMockMarkRead } = await import("./mock-data");
    return getMockMarkRead(notificationId);
  }
  return apiClient(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
  });
}

export async function markAllNotificationsRead() {
  if (DEV_AUTH) {
    const { getMockMarkAllRead } = await import("./mock-data");
    return getMockMarkAllRead();
  }
  return apiClient("/api/notifications/read-all", {
    method: "PUT",
  });
}

export async function acceptFollowRequest(requesterId: string) {
  if (DEV_AUTH) {
    const { getMockAcceptFollowRequest } = await import("./mock-data");
    return getMockAcceptFollowRequest(requesterId);
  }
  return apiClient(`/api/follow-requests/${requesterId}/accept`, {
    method: "POST",
  });
}

export async function declineFollowRequest(requesterId: string) {
  if (DEV_AUTH) {
    const { getMockDeclineFollowRequest } = await import("./mock-data");
    return getMockDeclineFollowRequest(requesterId);
  }
  return apiClient(`/api/follow-requests/${requesterId}/decline`, {
    method: "POST",
  });
}

// ---- Groups ----

export interface Group {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  createdAt: string;
  memberCount: number;
  creator: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  tags?: string[];
  imageUrl?: string;
  isMember?: boolean;
  isCreator?: boolean;
  hasRequested?: boolean;
}

export interface GroupMember {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  username: string;
  role: "creator" | "member";
}

export interface EventOption {
  id: string;
  label: string;
  count: number;
}

export interface GroupEvent {
  id: string;
  groupId: string;
  title: string;
  description: string;
  dateTime: string;
  createdBy: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  options: EventOption[];
  goingCount: number;
  notGoingCount: number;
  userResponse?: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  inviterId: string;
  inviter: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface CreateGroupPayload {
  name: string;
  description: string;
  tags?: string[];
  imageUrl?: string;
}

export interface CreateGroupPostPayload {
  groupId: string;
  title: string;
  content: string;
  image?: File;
  tags?: string[];
  contentFormat?: "plain" | "html";
}

export interface CreateGroupEventPayload {
  groupId: string;
  title: string;
  description: string;
  dateTime: string;
  options: string[];
}

export interface GroupDetailResponse extends Group {
  isMember: boolean;
  isCreator: boolean;
  hasRequested: boolean;
}

export async function getAllGroups() {
  if (DEV_AUTH) {
    const { getMockAllGroups } = await import("./mock-data");
    return getMockAllGroups();
  }
  return apiClient<Group[]>("/api/groups");
}

export async function getMyGroups() {
  if (DEV_AUTH) {
    const { getMockMyGroups } = await import("./mock-data");
    return getMockMyGroups();
  }
  return apiClient<Group[]>("/api/groups/my");
}

export async function getGroupDetail(groupId: string) {
  if (DEV_AUTH) {
    const { getMockGroupDetail } = await import("./mock-data");
    return getMockGroupDetail(groupId);
  }
  return apiClient<GroupDetailResponse>(`/api/groups/${groupId}`);
}

export async function createGroup(payload: CreateGroupPayload) {
  if (DEV_AUTH) {
    const { getMockCreateGroup } = await import("./mock-data");
    return getMockCreateGroup(payload);
  }
  return apiClient<Group>("/api/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteGroup(groupId: string) {
  if (DEV_AUTH) {
    const { getMockDeleteGroup } = await import("./mock-data");
    return getMockDeleteGroup(groupId);
  }
  return apiClient(`/api/groups/${groupId}`, {
    method: "DELETE",
  });
}

export async function kickMember(groupId: string, memberId: string) {
  return apiClient(`/api/groups/${groupId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export async function leaveGroup(groupId: string) {
  return apiClient(`/api/groups/${groupId}/leave`, {
    method: "POST",
  });
}

export async function requestJoinGroup(groupId: string) {
  if (DEV_AUTH) {
    const { getMockRequestJoinGroup } = await import("./mock-data");
    return getMockRequestJoinGroup(groupId);
  }
  return apiClient(`/api/groups/${groupId}/join`, {
    method: "POST",
  });
}

export async function cancelJoinRequest(groupId: string) {
  return apiClient(`/api/groups/${groupId}/join`, {
    method: "DELETE",
  });
}

export async function getGroupJoinRequests(groupId: string) {
  if (DEV_AUTH) {
    const { getMockGroupJoinRequests } = await import("./mock-data");
    return getMockGroupJoinRequests(groupId);
  }
  return apiClient<GroupJoinRequest[]>(`/api/groups/${groupId}/join-requests`);
}

export async function acceptJoinRequest(groupId: string, userId: string) {
  if (DEV_AUTH) {
    const { getMockAcceptJoinRequest } = await import("./mock-data");
    return getMockAcceptJoinRequest(groupId, userId);
  }
  return apiClient(`/api/groups/${groupId}/join-requests/${userId}/accept`, {
    method: "POST",
  });
}

export async function declineJoinRequest(groupId: string, userId: string) {
  if (DEV_AUTH) {
    const { getMockDeclineJoinRequest } = await import("./mock-data");
    return getMockDeclineJoinRequest(groupId, userId);
  }
  return apiClient(`/api/groups/${groupId}/join-requests/${userId}/decline`, {
    method: "POST",
  });
}

export async function inviteToGroup(groupId: string, userId: string) {
  if (DEV_AUTH) {
    const { getMockInviteToGroup } = await import("./mock-data");
    return getMockInviteToGroup(groupId, userId);
  }
  return apiClient(`/api/groups/${groupId}/invite`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function getGroupInvitations() {
  if (DEV_AUTH) {
    const { getMockGroupInvitations } = await import("./mock-data");
    return getMockGroupInvitations();
  }
  return apiClient<GroupInvitation[]>("/api/groups/invitations");
}

export async function acceptGroupInvitation(groupId: string) {
  if (DEV_AUTH) {
    const { getMockAcceptGroupInvitation } = await import("./mock-data");
    return getMockAcceptGroupInvitation(groupId);
  }
  return apiClient(`/api/groups/${groupId}/accept-invitation`, {
    method: "POST",
  });
}

export async function declineGroupInvitation(groupId: string) {
  if (DEV_AUTH) {
    const { getMockDeclineGroupInvitation } = await import("./mock-data");
    return getMockDeclineGroupInvitation(groupId);
  }
  return apiClient(`/api/groups/${groupId}/decline-invitation`, {
    method: "POST",
  });
}

export async function getGroupMembers(groupId: string) {
  if (DEV_AUTH) {
    const { getMockGroupMembers } = await import("./mock-data");
    return getMockGroupMembers(groupId);
  }
  return apiClient<GroupMember[]>(`/api/groups/${groupId}/members`);
}

export async function getGroupPosts(groupId: string) {
  if (DEV_AUTH) {
    const { getMockGroupPosts } = await import("./mock-data");
    return getMockGroupPosts(groupId);
  }
  return apiClient<Post[]>(`/api/groups/${groupId}/posts`);
}

export async function createGroupPost(payload: CreateGroupPostPayload) {
  if (DEV_AUTH) {
    const { getMockCreateGroupPost } = await import("./mock-data");
    return getMockCreateGroupPost(payload);
  }
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("content", payload.content);
  formData.append("content_format", payload.contentFormat || "plain");
  if (payload.image) formData.append("image", payload.image);
  if (payload.tags?.length) formData.append("tags", JSON.stringify(payload.tags));

  return apiClient<Post>(`/api/groups/${payload.groupId}/posts`, {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export async function getGroupEvents(groupId: string) {
  if (DEV_AUTH) {
    const { getMockGroupEvents } = await import("./mock-data");
    return getMockGroupEvents(groupId);
  }
  const result = await apiClient<{ events: GroupEvent[] }>(`/api/groups/${groupId}/events`);
  if (result.data) {
    return { data: result.data.events, status: result.status };
  }
  return { error: result.error, status: result.status } as ApiResponse<GroupEvent[]>;
}

export async function createGroupEvent(payload: CreateGroupEventPayload) {
  if (DEV_AUTH) {
    const { getMockCreateGroupEvent } = await import("./mock-data");
    return getMockCreateGroupEvent(payload);
  }
  return apiClient<GroupEvent>(`/api/groups/${payload.groupId}/events`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function respondToGroupEvent(
  eventId: string,
  response: string,
) {
  if (DEV_AUTH) {
    const { getMockRespondToGroupEvent } = await import("./mock-data");
    return getMockRespondToGroupEvent(eventId, response);
  }
  return apiClient(`/api/events/${eventId}/rsvp`, {
    method: "POST",
    body: JSON.stringify({ response }),
  });
}

export interface EventRespondent {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl?: string;
}

export interface EventOptionRespondents {
  id: string;
  label: string;
  respondents: EventRespondent[];
}

export async function getEventRespondents(eventId: string) {
  return apiClient<{ going: EventRespondent[]; notGoing: EventRespondent[]; options: EventOptionRespondents[] }>(
    `/api/events/${eventId}/respondents`,
  );
}

// ---- Chat ----

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  seq?: number;
  sender: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export interface Conversation {
  id: string;
  type: "private" | "group";
  participant?: {
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  group?: {
    groupId: string;
    title: string;
    imageUrl?: string;
    memberCount: number;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

export async function getConversations() {
  if (DEV_AUTH) {
    const { getMockConversations } = await import("./mock-data");
    return getMockConversations();
  }
  return apiClient<Conversation[]>("/api/chat/conversations");
}

export async function getConversationMessages(
  conversationId: string,
  options?: { limit?: number; offset?: number },
) {
  if (DEV_AUTH) {
    const { getMockConversationMessages } = await import("./mock-data");
    return getMockConversationMessages(conversationId);
  }

  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (typeof options?.offset === "number" && options.offset >= 0) {
    params.set("offset", String(options.offset));
  }

  const qs = params.toString();
  return apiClient<ChatMessage[]>(
    `/api/chat/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
  );
}

export async function sendChatMessage(payload: SendMessagePayload) {
  if (DEV_AUTH) {
    const { getMockSendMessage } = await import("./mock-data");
    return getMockSendMessage(payload);
  }
  return apiClient<ChatMessage>("/api/chat/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrCreateConversation(userId: string) {
  if (DEV_AUTH) {
    const { getMockGetOrCreateConversation } = await import("./mock-data");
    return getMockGetOrCreateConversation(userId);
  }
  return apiClient<Conversation>(`/api/chat/conversations/private/${userId}`, {
    method: "POST",
  });
}

export async function markConversationRead(conversationId: string) {
  return apiClient<{ status: string }>(
    `/api/chat/conversations/${conversationId}/read`,
    {
      method: "PUT",
    },
  );
}

export async function getUnreadChatCount() {
  if (DEV_AUTH) {
    const { getMockUnreadChatCount } = await import("./mock-data");
    return getMockUnreadChatCount();
  }
  return apiClient<{ count: number }>("/api/chat/unread-count");
}

// ---- Search ----

export interface SearchResponse {
  users: User[];
  posts: Post[];
  groups: Group[];
}

export async function search(query: string) {
  if (DEV_AUTH) {
    const { getMockSearch } = await import("./mock-data");
    return getMockSearch(query);
  }
  return apiClient<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`);
}