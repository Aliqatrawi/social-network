/**
 * Mock data for frontend development without a backend.
 * Activated by NEXT_PUBLIC_DEV_AUTH=true in .env.local.
 * Delete this file when the real backend is ready.
 */

import type {
  ProfileResponse,
  Post,
  FollowUser,
  User,
  Comment,
  Notification,
  Group,
  GroupDetailResponse,
  GroupMember,
  GroupEvent,
  GroupInvitation,
  GroupJoinRequest,
  ChatMessage,
  Conversation,
  UpdateProfilePayload,
  ActivityItem,
  ReactionResponse,
  SearchResponse,
} from "./api";

// ---- Mock Users ----

export const MOCK_USERS: Record<string, User> = {
  "dev-user-1": {
    id: "dev-user-1",
    email: "dev@waves.app",
    firstName: "Dev",
    lastName: "User",
    dateOfBirth: "2000-01-01",
    username: "developer",
    aboutMe:
      "Full-stack developer building Waves. Passionate about clean UI and great user experiences.",
    avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    bannerUrl: "https://picsum.photos/seed/banner1/1200/400",
    isPublic: true,
  },
  "user-2": {
    id: "user-2",
    email: "sarah@example.com",
    firstName: "Sarah",
    lastName: "Chen",
    dateOfBirth: "1998-05-14",
    username: "sarahc",
    aboutMe:
      "Designer & photographer. Love capturing moments and creating beautiful interfaces.",
    avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    bannerUrl: "https://picsum.photos/seed/banner2/1200/400",
    isPublic: true,
  },
  "user-3": {
    id: "user-3",
    email: "omar@example.com",
    firstName: "Omar",
    lastName: "Hassan",
    dateOfBirth: "1997-11-22",
    username: "omar_h",
    aboutMe: "Music producer and coffee enthusiast.",
    avatarUrl: "https://i.pravatar.cc/150?u=user-3",
    bannerUrl: "https://picsum.photos/seed/banner3/1200/400",
    isPublic: false,
  },
  "user-4": {
    id: "user-4",
    email: "lina@example.com",
    firstName: "Lina",
    lastName: "Park",
    dateOfBirth: "2001-03-08",
    username: "lina",
    aboutMe:
      "Traveling the world one city at a time. Currently in Tokyo.",
    avatarUrl: "https://i.pravatar.cc/150?u=user-4",
    bannerUrl: "https://picsum.photos/seed/banner4/1200/400",
    isPublic: true,
  },
  "user-5": {
    id: "user-5",
    email: "james@example.com",
    firstName: "James",
    lastName: "Wilson",
    dateOfBirth: "1999-07-30",
    username: "jwilson",
    aboutMe:
      "Backend engineer who secretly loves frontend. TypeScript enthusiast.",
    avatarUrl: "https://i.pravatar.cc/150?u=user-5",
    bannerUrl: "https://picsum.photos/seed/banner5/1200/400",
    isPublic: true,
  },
};

// ---- Follow Graph ----
// dev-user-1 follows: user-2, user-5
// dev-user-1 followed by: user-2, user-5
// dev-user-1 requested: user-4
// user-3: dev-user-1 NOT following (private profile test)

const followGraph: Record<string, string[]> = {
  "dev-user-1": ["user-2", "user-5"],
  "user-2": ["dev-user-1", "user-5", "user-4"],
  "user-3": ["user-2"],
  "user-4": ["user-2", "user-3"],
  "user-5": ["dev-user-1", "user-2"],
};

const followRequests: Record<string, string[]> = {
  "user-4": ["dev-user-1"], // dev-user-1 has a pending request to user-4
};

// ---- Mock Posts ----

const CURRENT_USER_ID = "dev-user-1";

// Tracks reactions: postId → userId → "like" | "dislike"
const postReactions: Record<string, Record<string, "like" | "dislike">> = {
  "post-1": { "user-2": "like", "user-3": "like", "user-5": "like" },
  "post-4": { "dev-user-1": "like", "user-3": "like" },
  "post-7": { "dev-user-1": "like", "user-2": "dislike" },
  "post-8": { "user-2": "like", "user-3": "like", "dev-user-1": "like" },
  "post-2": { "user-5": "like" },
  "post-5": { "dev-user-1": "dislike" },
};

function getPostReactionCounts(postId: string) {
  const reactions = postReactions[postId] || {};
  let likeCount = 0;
  let dislikeCount = 0;
  for (const r of Object.values(reactions)) {
    if (r === "like") likeCount++;
    else dislikeCount++;
  }
  const userReaction = reactions[CURRENT_USER_ID] || null;
  return { likeCount, dislikeCount, userReaction };
}

export const MOCK_POSTS: Post[] = [
  {
    id: "post-1",
    userId: "dev-user-1",
    title: "Waves Frontend Launch",
    content:
      "Just shipped the new Waves frontend! Glass design is looking incredible in dark mode. What do you all think?",
    imageUrl: "https://picsum.photos/seed/waves1/800/400",
    privacy: "public",
    createdAt: "2026-02-20T10:30:00Z",
    author: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
    tags: ["waves", "frontend", "darkmode"],
    commentCount: 0,
    ...getPostReactionCounts("post-1"),
  },
  {
    id: "post-2",
    userId: "dev-user-1",
    title: "Profile Page Progress",
    content:
      "Working on the profile page today. Liquid glass effect + orange gradients = perfection.",
    privacy: "public",
    createdAt: "2026-02-19T14:15:00Z",
    author: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
    tags: ["ui", "design"],
    commentCount: 0,
    ...getPostReactionCounts("post-2"),
  },
  {
    id: "post-3",
    userId: "dev-user-1",
    title: "Tailwind CSS v4 is a Game Changer",
    content:
      "Hot take: Tailwind CSS v4 with the CSS-first config is a game changer. No more config files!",
    privacy: "almost_private",
    createdAt: "2026-02-18T09:00:00Z",
    author: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
    tags: ["tailwind", "css", "webdev"],
    commentCount: 0,
    ...getPostReactionCounts("post-3"),
  },
  {
    id: "post-4",
    userId: "user-2",
    title: "Rooftop Sunset",
    content:
      "Captured the sunset from the rooftop today. The colors were unreal — nature is the best designer.",
    imageUrl: "https://picsum.photos/seed/sunset2/800/500",
    privacy: "public",
    createdAt: "2026-02-20T18:45:00Z",
    author: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
    tags: ["photography", "sunset"],
    commentCount: 0,
    ...getPostReactionCounts("post-4"),
  },
  {
    id: "post-5",
    userId: "user-2",
    title: "Portfolio Website Launch",
    content:
      "New portfolio website is live! Built with Next.js and HeroUI. Link in bio.",
    privacy: "public",
    createdAt: "2026-02-17T11:20:00Z",
    author: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
    tags: ["portfolio", "nextjs"],
    commentCount: 0,
    ...getPostReactionCounts("post-5"),
  },
  {
    id: "post-6",
    userId: "user-3",
    title: "Late Night Beat Drop",
    content:
      "New beat dropped. This one hits different at 2 AM with headphones.",
    privacy: "private",
    createdAt: "2026-02-19T02:10:00Z",
    author: {
      firstName: "Omar",
      lastName: "Hassan",
      avatarUrl: "https://i.pravatar.cc/150?u=user-3",
    },
    tags: ["music", "beats"],
    commentCount: 0,
    ...getPostReactionCounts("post-6"),
  },
  {
    id: "post-7",
    userId: "user-5",
    title: "REST to GraphQL Migration",
    content:
      "Finally migrated the entire API from REST to GraphQL. Performance improved by 40%. Worth every refactor.",
    privacy: "public",
    createdAt: "2026-02-20T08:00:00Z",
    author: {
      firstName: "James",
      lastName: "Wilson",
      avatarUrl: "https://i.pravatar.cc/150?u=user-5",
    },
    tags: ["graphql", "api", "backend"],
    commentCount: 0,
    ...getPostReactionCounts("post-7"),
  },
  {
    id: "post-8",
    userId: "user-5",
    title: "Go-to-TypeScript CLI Tool",
    content:
      "Weekend project: built a CLI tool that generates TypeScript types from Go structs. Open source soon!",
    imageUrl: "https://picsum.photos/seed/code8/800/400",
    privacy: "public",
    createdAt: "2026-02-16T15:30:00Z",
    author: {
      firstName: "James",
      lastName: "Wilson",
      avatarUrl: "https://i.pravatar.cc/150?u=user-5",
    },
    tags: ["typescript", "golang", "opensource"],
    commentCount: 0,
    ...getPostReactionCounts("post-8"),
  },
];

// ---- Helper Functions (called from api.ts) ----

function toFollowUser(user: User): FollowUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}

function getFollowers(userId: string): FollowUser[] {
  // Find all users who follow this userId
  return Object.entries(followGraph)
    .filter(([, following]) => following.includes(userId))
    .map(([followerId]) => MOCK_USERS[followerId])
    .filter(Boolean)
    .map(toFollowUser);
}

function getFollowing(userId: string): FollowUser[] {
  const ids = followGraph[userId] || [];
  return ids.map((id) => MOCK_USERS[id]).filter(Boolean).map(toFollowUser);
}

function isFollowing(fromId: string, toId: string): boolean {
  return (followGraph[fromId] || []).includes(toId);
}

function hasRequested(fromId: string, toId: string): boolean {
  return (followRequests[toId] || []).includes(fromId);
}

// ---- Mock API Response Builders ----

type ApiResponse<T> = { data?: T; error?: string; status: number };

// ---- Activities (X/Twitter-style: own posts + posts user commented on) ----

function buildMockActivities(userId: string): ActivityItem[] {
  const items: ActivityItem[] = [];
  const seen = new Set<string>();

  // User's own posts
  for (const post of MOCK_POSTS.filter((p) => p.userId === userId)) {
    items.push({
      id: `act-post-${post.id}`,
      type: "posted",
      label: "Posted",
      timestamp: post.createdAt,
      post,
    });
    seen.add(post.id);
  }

  // Posts the user commented on (but didn't author)
  for (const comment of MOCK_COMMENTS.filter((c) => c.userId === userId)) {
    if (seen.has(comment.postId)) continue;
    seen.add(comment.postId);
    const post = MOCK_POSTS.find((p) => p.id === comment.postId);
    if (post) {
      items.push({
        id: `act-comment-${comment.id}`,
        type: "commented",
        label: `Commented on ${post.author.firstName}'s post`,
        timestamp: comment.createdAt,
        post,
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getMockUserActivities(userId: string): ApiResponse<ActivityItem[]> {
  return { data: buildMockActivities(userId), status: 200 };
}

export function getMockProfile(userId: string): ApiResponse<ProfileResponse> {
  const user = MOCK_USERS[userId];
  if (!user) {
    return { error: "User not found", status: 404 };
  }

  const userPosts = MOCK_POSTS.filter((p) => p.userId === userId);
  const userFollowers = getFollowers(userId);
  const userFollowing = getFollowing(userId);

  return {
    data: {
      ...user,
      postsCount: userPosts.length,
      followersCount: userFollowers.length,
      followingCount: userFollowing.length,
      activitiesCount: buildMockActivities(userId).length,
      isFollowedByMe: isFollowing(CURRENT_USER_ID, userId),
      isFollowRequested: hasRequested(CURRENT_USER_ID, userId),
    },
    status: 200,
  };
}

export function getMockUserPosts(userId: string): ApiResponse<Post[]> {
  const posts = MOCK_POSTS.filter((p) => p.userId === userId);
  return { data: posts, status: 200 };
}

export function getMockFollowers(userId: string): ApiResponse<FollowUser[]> {
  return { data: getFollowers(userId), status: 200 };
}

export function getMockFollowing(userId: string): ApiResponse<FollowUser[]> {
  return { data: getFollowing(userId), status: 200 };
}

export function getMockFollowAction(
  userId: string
): ApiResponse<{ status: string }> {
  const targetUser = MOCK_USERS[userId];
  if (!targetUser) {
    return { error: "User not found", status: 404 };
  }
  // Private profiles → request, public → instant follow
  const status = targetUser.isPublic ? "following" : "requested";
  return { data: { status }, status: 200 };
}

export function getMockUnfollowAction(): ApiResponse<unknown> {
  return { data: {}, status: 200 };
}

export function getMockCancelFollowRequest(
  userId: string,
): ApiResponse<unknown> {
  if (followRequests[userId]) {
    followRequests[userId] = followRequests[userId].filter(
      (id) => id !== CURRENT_USER_ID,
    );
  }
  return { data: { status: "cancelled" }, status: 200 };
}

export function getMockUploadFile(file: File): ApiResponse<{ url: string }> {
  const url = URL.createObjectURL(file);
  return { data: { url }, status: 200 };
}

export function getMockUpdateProfile(
  data: UpdateProfilePayload,
): ApiResponse<User> {
  const user = { ...MOCK_USERS[CURRENT_USER_ID] };
  if (data.firstName !== undefined) {
    user.firstName = data.firstName;
    MOCK_USERS[CURRENT_USER_ID].firstName = data.firstName;
  }
  if (data.lastName !== undefined) {
    user.lastName = data.lastName;
    MOCK_USERS[CURRENT_USER_ID].lastName = data.lastName;
  }
  if (data.username !== undefined) {
    user.username = data.username;
    MOCK_USERS[CURRENT_USER_ID].username = data.username;
  }
  if (data.aboutMe !== undefined) {
    user.aboutMe = data.aboutMe;
    MOCK_USERS[CURRENT_USER_ID].aboutMe = data.aboutMe;
  }
  if (data.avatarUrl !== undefined) {
    user.avatarUrl = data.avatarUrl;
    MOCK_USERS[CURRENT_USER_ID].avatarUrl = data.avatarUrl;
  }
  if (data.bannerUrl !== undefined) {
    user.bannerUrl = data.bannerUrl;
    MOCK_USERS[CURRENT_USER_ID].bannerUrl = data.bannerUrl;
  }
  if (data.isPublic !== undefined) {
    user.isPublic = data.isPublic;
    MOCK_USERS[CURRENT_USER_ID].isPublic = data.isPublic;
  }
  return { data: user, status: 200 };
}

export function getMockCurrentUser(): ApiResponse<User> {
  return { data: MOCK_USERS[CURRENT_USER_ID], status: 200 };
}

export function getMockLogin(): ApiResponse<User> {
  return { data: MOCK_USERS[CURRENT_USER_ID], status: 200 };
}

export function getMockLogout(): ApiResponse<unknown> {
  return { data: {}, status: 200 };
}

// ---- Feed ----

export function getMockFeedPosts(): ApiResponse<Post[]> {
  // Feed shows: own posts + posts from users we follow (public & almost_private)
  const followedIds = followGraph[CURRENT_USER_ID] || [];
  const visibleUserIds = [CURRENT_USER_ID, ...followedIds];

  const feed = MOCK_POSTS.filter(
    (p) =>
      visibleUserIds.includes(p.userId) &&
      (p.privacy === "public" || p.privacy === "almost_private" || p.userId === CURRENT_USER_ID)
  ).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return { data: feed, status: 200 };
}

let mockPostCounter = 100;

export function getMockCreatePost(payload: {
  title: string;
  content: string;
  privacy: "public" | "almost_private" | "private";
  tags?: string[];
}): ApiResponse<Post> {
  const user = MOCK_USERS[CURRENT_USER_ID];
  const newPost: Post = {
    id: `post-new-${++mockPostCounter}`,
    userId: CURRENT_USER_ID,
    title: payload.title,
    content: payload.content,
    privacy: payload.privacy,
    createdAt: new Date().toISOString(),
    author: {
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
    tags: payload.tags || [],
    commentCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    userReaction: null,
  };
  MOCK_POSTS.unshift(newPost);
  return { data: newPost, status: 201 };
}

export function getMockDeletePost(postId: string): ApiResponse<unknown> {
  const index = MOCK_POSTS.findIndex((p) => p.id === postId);
  if (index === -1) {
    return { error: "Post not found", status: 404 };
  }
  MOCK_POSTS.splice(index, 1);
  return { data: {}, status: 200 };
}

export function getMockReactToPost(
  postId: string,
  reaction: "like" | "dislike",
): ApiResponse<ReactionResponse> {
  if (!postReactions[postId]) {
    postReactions[postId] = {};
  }
  const current = postReactions[postId][CURRENT_USER_ID];

  if (current === reaction) {
    // Toggle off
    delete postReactions[postId][CURRENT_USER_ID];
  } else {
    // Set or switch
    postReactions[postId][CURRENT_USER_ID] = reaction;
  }

  const counts = getPostReactionCounts(postId);

  // Also update the post object in MOCK_POSTS
  const post = MOCK_POSTS.find((p) => p.id === postId);
  if (post) {
    post.likeCount = counts.likeCount;
    post.dislikeCount = counts.dislikeCount;
    post.userReaction = counts.userReaction;
  }

  return { data: counts, status: 200 };
}

// ---- Comments ----

export const MOCK_COMMENTS: Comment[] = [
  {
    id: "comment-1",
    postId: "post-1",
    userId: "user-2",
    content: "This looks amazing! The glass effect is so smooth.",
    createdAt: "2026-02-20T10:45:00Z",
    author: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
  },
  {
    id: "comment-2",
    postId: "post-1",
    userId: "user-5",
    content: "Can't wait to try this out! When's the public release?",
    createdAt: "2026-02-20T11:20:00Z",
    author: {
      firstName: "James",
      lastName: "Wilson",
      avatarUrl: "https://i.pravatar.cc/150?u=user-5",
    },
  },
  {
    id: "comment-3",
    postId: "post-1",
    userId: "dev-user-1",
    content: "Thanks everyone! Working on it every day. Stay tuned.",
    createdAt: "2026-02-20T12:00:00Z",
    author: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
  },
  {
    id: "comment-4",
    postId: "post-4",
    userId: "dev-user-1",
    content: "Incredible shot! What camera did you use?",
    createdAt: "2026-02-20T19:00:00Z",
    author: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
  },
  {
    id: "comment-5",
    postId: "post-4",
    userId: "user-5",
    content: "The golden hour hits different from rooftops.",
    createdAt: "2026-02-20T19:30:00Z",
    author: {
      firstName: "James",
      lastName: "Wilson",
      avatarUrl: "https://i.pravatar.cc/150?u=user-5",
    },
  },
  {
    id: "comment-6",
    postId: "post-7",
    userId: "dev-user-1",
    content: "40% improvement is massive. Did you use DataLoader for batching?",
    createdAt: "2026-02-20T09:15:00Z",
    author: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
  },
  {
    id: "comment-7",
    postId: "post-7",
    userId: "user-2",
    content: "GraphQL is the way to go. We switched last year and never looked back.",
    createdAt: "2026-02-20T10:00:00Z",
    author: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
  },
  {
    id: "comment-8",
    postId: "post-2",
    userId: "user-5",
    content: "Liquid glass is going to be everywhere. Great execution!",
    createdAt: "2026-02-19T15:00:00Z",
    author: {
      firstName: "James",
      lastName: "Wilson",
      avatarUrl: "https://i.pravatar.cc/150?u=user-5",
    },
  },
];

let mockCommentCounter = 100;

export function getMockPostComments(postId: string): ApiResponse<Comment[]> {
  const comments = MOCK_COMMENTS.filter((c) => c.postId === postId).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return { data: comments, status: 200 };
}

export function getMockCreateComment(payload: {
  postId: string;
  content: string;
}): ApiResponse<Comment> {
  const user = MOCK_USERS[CURRENT_USER_ID];
  const newComment: Comment = {
    id: `comment-new-${++mockCommentCounter}`,
    postId: payload.postId,
    userId: CURRENT_USER_ID,
    content: payload.content,
    createdAt: new Date().toISOString(),
    author: {
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
  };
  MOCK_COMMENTS.push(newComment);
  return { data: newComment, status: 201 };
}

export function getMockDeleteComment(commentId: string): ApiResponse<unknown> {
  const index = MOCK_COMMENTS.findIndex((c) => c.id === commentId);
  if (index === -1) {
    return { error: "Comment not found", status: 404 };
  }
  MOCK_COMMENTS.splice(index, 1);
  return { data: {}, status: 200 };
}

// ---- Notifications ----

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    type: "follow_request",
    userId: "dev-user-1",
    actorId: "user-3",
    actor: {
      firstName: "Omar",
      lastName: "Hassan",
      avatarUrl: "https://i.pravatar.cc/150?u=user-3",
    },
    isRead: false,
    actionPending: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-2",
    type: "comment",
    userId: "dev-user-1",
    actorId: "user-2",
    actor: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
    isRead: false,
    actionPending: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    metadata: { postId: "post-1" },
  },
  {
    id: "notif-3",
    type: "new_follower",
    userId: "dev-user-1",
    actorId: "user-5",
    actor: {
      firstName: "James",
      lastName: "Wilson",
      avatarUrl: "https://i.pravatar.cc/150?u=user-5",
    },
    isRead: false,
    actionPending: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-4",
    type: "follow_accepted",
    userId: "dev-user-1",
    actorId: "user-4",
    actor: {
      firstName: "Lina",
      lastName: "Park",
      avatarUrl: "https://i.pravatar.cc/150?u=user-4",
    },
    isRead: true,
    actionPending: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getMockNotifications(): ApiResponse<Notification[]> {
  const sorted = [...MOCK_NOTIFICATIONS].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return { data: sorted, status: 200 };
}

export function getMockUnreadCount(): ApiResponse<{ count: number }> {
  const count = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
  return { data: { count }, status: 200 };
}

export function getMockMarkRead(notificationId: string): ApiResponse<unknown> {
  const notif = MOCK_NOTIFICATIONS.find((n) => n.id === notificationId);
  if (!notif) {
    return { error: "Notification not found", status: 404 };
  }
  notif.isRead = true;
  return { data: {}, status: 200 };
}

export function getMockMarkAllRead(): ApiResponse<unknown> {
  MOCK_NOTIFICATIONS.forEach((n) => {
    n.isRead = true;
  });
  return { data: {}, status: 200 };
}

export function getMockAcceptFollowRequest(
  requesterId: string,
): ApiResponse<unknown> {
  if (!followGraph[requesterId]) {
    followGraph[requesterId] = [];
  }
  if (!followGraph[requesterId].includes(CURRENT_USER_ID)) {
    followGraph[requesterId].push(CURRENT_USER_ID);
  }

  if (followRequests[CURRENT_USER_ID]) {
    followRequests[CURRENT_USER_ID] = followRequests[CURRENT_USER_ID].filter(
      (id) => id !== requesterId,
    );
  }

  const notif = MOCK_NOTIFICATIONS.find(
    (n) => n.type === "follow_request" && n.actorId === requesterId,
  );
  if (notif) notif.isRead = true;

  return { data: {}, status: 200 };
}

export function getMockDeclineFollowRequest(
  requesterId: string,
): ApiResponse<unknown> {
  if (followRequests[CURRENT_USER_ID]) {
    followRequests[CURRENT_USER_ID] = followRequests[CURRENT_USER_ID].filter(
      (id) => id !== requesterId,
    );
  }

  const notif = MOCK_NOTIFICATIONS.find(
    (n) => n.type === "follow_request" && n.actorId === requesterId,
  );
  if (notif) notif.isRead = true;

  return { data: {}, status: 200 };
}

// ---- Groups ----

const MOCK_GROUPS: Group[] = [
  {
    id: "group-1",
    name: "Waves Dev Team",
    description:
      "The official development team behind Waves. Discussing features, bugs, and everything frontend.",
    creatorId: "dev-user-1",
    createdAt: "2026-02-10T10:00:00Z",
    memberCount: 3,
    creator: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
    tags: ["development", "waves", "frontend"],
    imageUrl: "https://picsum.photos/seed/group1/400/200",
  },
  {
    id: "group-2",
    name: "Photography Club",
    description:
      "Share your best shots, discuss techniques, and get feedback from fellow photographers.",
    creatorId: "user-2",
    createdAt: "2026-02-12T14:00:00Z",
    memberCount: 3,
    creator: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
    tags: ["photography", "art", "creative"],
    imageUrl: "https://picsum.photos/seed/group2/400/200",
  },
  {
    id: "group-3",
    name: "Coffee Lovers",
    description:
      "For those who appreciate a good brew. Reviews, recipes, and cafe recommendations.",
    creatorId: "user-4",
    createdAt: "2026-02-15T09:00:00Z",
    memberCount: 2,
    creator: {
      firstName: "Lina",
      lastName: "Park",
      avatarUrl: "https://i.pravatar.cc/150?u=user-4",
    },
    tags: ["coffee", "food", "lifestyle"],
    imageUrl: "https://picsum.photos/seed/group3/400/200",
  },
];

// groupId → list of { userId, role }
const groupMemberships: Record<string, { userId: string; role: "creator" | "member" }[]> = {
  "group-1": [
    { userId: "dev-user-1", role: "creator" },
    { userId: "user-2", role: "member" },
    { userId: "user-5", role: "member" },
  ],
  "group-2": [
    { userId: "user-2", role: "creator" },
    { userId: "dev-user-1", role: "member" },
    { userId: "user-4", role: "member" },
  ],
  "group-3": [
    { userId: "user-4", role: "creator" },
    { userId: "user-3", role: "member" },
  ],
};

// groupId → list of pending join requests
const groupJoinRequests: Record<string, GroupJoinRequest[]> = {
  "group-1": [
    {
      id: "gjr-1",
      groupId: "group-1",
      userId: "user-3",
      user: {
        firstName: "Omar",
        lastName: "Hassan",
        avatarUrl: "https://i.pravatar.cc/150?u=user-3",
      },
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// groupId → list of pending invitations (userId being invited)
const groupInvitations: GroupInvitation[] = [];

const MOCK_GROUP_POSTS: Post[] = [
  {
    id: "gpost-1",
    userId: "dev-user-1",
    title: "Welcome to Waves Dev Team",
    content:
      "Welcome to the Waves Dev Team group! Let's use this space to coordinate on the frontend build.",
    privacy: "private",
    createdAt: "2026-02-10T10:30:00Z",
    author: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
    tags: ["team", "waves"],
    commentCount: 0,
    ...getPostReactionCounts("gpost-1"),
  },
  {
    id: "gpost-2",
    userId: "user-2",
    title: "New Color Palette Update",
    content:
      "Just pushed the new color palette. Check the latest commit for the orange gradients.",
    privacy: "private",
    createdAt: "2026-02-18T16:00:00Z",
    author: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
    tags: ["design", "colors"],
    commentCount: 0,
    ...getPostReactionCounts("gpost-2"),
  },
  {
    id: "gpost-3",
    userId: "user-2",
    title: "Golden Hour Challenge",
    content:
      "Golden hour photography challenge: post your best golden hour shot this week!",
    imageUrl: "https://picsum.photos/seed/golden/800/400",
    privacy: "private",
    createdAt: "2026-02-16T17:00:00Z",
    author: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
    tags: ["photography", "challenge"],
    commentCount: 0,
    ...getPostReactionCounts("gpost-3"),
  },
  {
    id: "gpost-4",
    userId: "dev-user-1",
    title: "Manual Focus Experiment",
    content:
      "Tried shooting with manual focus today — much harder than expected but the results are worth it.",
    privacy: "private",
    createdAt: "2026-02-17T12:00:00Z",
    author: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
    tags: ["photography"],
    commentCount: 0,
    ...getPostReactionCounts("gpost-4"),
  },
];

// Map postId → groupId for group posts
const groupPostMap: Record<string, string> = {
  "gpost-1": "group-1",
  "gpost-2": "group-1",
  "gpost-3": "group-2",
  "gpost-4": "group-2",
};

const MOCK_GROUP_EVENTS: GroupEvent[] = [
  {
    id: "event-1",
    groupId: "group-1",
    title: "Sprint Planning",
    description:
      "Plan the next sprint. Bring your feature ideas and bug reports.",
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdBy: {
      firstName: "Dev",
      lastName: "User",
      avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1",
    },
    options: [
      { id: "opt-1a", label: "Going", count: 2 },
      { id: "opt-1b", label: "Not Going", count: 1 },
    ],
    goingCount: 2,
    notGoingCount: 1,
    userResponse: "opt-1a",
  },
  {
    id: "event-2",
    groupId: "group-1",
    title: "Team Lunch",
    description:
      "Casual team lunch to celebrate the frontend milestone. Location TBD.",
    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: {
      firstName: "Sarah",
      lastName: "Chen",
      avatarUrl: "https://i.pravatar.cc/150?u=user-2",
    },
    options: [
      { id: "opt-2a", label: "Going", count: 1 },
      { id: "opt-2b", label: "Not Going", count: 0 },
    ],
    goingCount: 1,
    notGoingCount: 0,
  },
];

// eventId → { userId: response }
const eventResponses: Record<string, Record<string, string>> = {
  "event-1": {
    "dev-user-1": "going",
    "user-2": "going",
    "user-5": "not_going",
  },
  "event-2": {
    "user-2": "going",
  },
};

// ---- Group Mock Functions ----

function getGroupMemberCount(groupId: string): number {
  return (groupMemberships[groupId] || []).length;
}

function isGroupMember(groupId: string, userId: string): boolean {
  return (groupMemberships[groupId] || []).some((m) => m.userId === userId);
}

function isGroupCreator(groupId: string, userId: string): boolean {
  return (groupMemberships[groupId] || []).some(
    (m) => m.userId === userId && m.role === "creator",
  );
}

function hasRequestedJoin(groupId: string, userId: string): boolean {
  return (groupJoinRequests[groupId] || []).some((r) => r.userId === userId);
}

export function getMockAllGroups(): ApiResponse<Group[]> {
  const groups = MOCK_GROUPS.map((g) => ({
    ...g,
    memberCount: getGroupMemberCount(g.id),
  }));
  return { data: groups, status: 200 };
}

export function getMockMyGroups(): ApiResponse<Group[]> {
  const myGroupIds = Object.entries(groupMemberships)
    .filter(([, members]) => members.some((m) => m.userId === CURRENT_USER_ID))
    .map(([groupId]) => groupId);

  const groups = MOCK_GROUPS.filter((g) => myGroupIds.includes(g.id)).map(
    (g) => ({ ...g, memberCount: getGroupMemberCount(g.id) }),
  );
  return { data: groups, status: 200 };
}

export function getMockGroupDetail(
  groupId: string,
): ApiResponse<GroupDetailResponse> {
  const group = MOCK_GROUPS.find((g) => g.id === groupId);
  if (!group) {
    return { error: "Group not found", status: 404 };
  }
  return {
    data: {
      ...group,
      memberCount: getGroupMemberCount(groupId),
      isMember: isGroupMember(groupId, CURRENT_USER_ID),
      isCreator: isGroupCreator(groupId, CURRENT_USER_ID),
      hasRequested: hasRequestedJoin(groupId, CURRENT_USER_ID),
    },
    status: 200,
  };
}

let mockGroupCounter = 100;

export function getMockCreateGroup(payload: {
  name: string;
  description: string;
  tags?: string[];
  imageUrl?: string;
}): ApiResponse<Group> {
  const user = MOCK_USERS[CURRENT_USER_ID];
  const newGroup: Group = {
    id: `group-new-${++mockGroupCounter}`,
    name: payload.name,
    description: payload.description,
    creatorId: CURRENT_USER_ID,
    createdAt: new Date().toISOString(),
    memberCount: 1,
    creator: {
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
    tags: payload.tags || [],
    imageUrl: payload.imageUrl,
  };
  MOCK_GROUPS.push(newGroup);
  groupMemberships[newGroup.id] = [
    { userId: CURRENT_USER_ID, role: "creator" },
  ];
  return { data: newGroup, status: 201 };
}

export function getMockDeleteGroup(groupId: string): ApiResponse<unknown> {
  const index = MOCK_GROUPS.findIndex((g) => g.id === groupId);
  if (index === -1) return { error: "Group not found", status: 404 };
  MOCK_GROUPS.splice(index, 1);
  delete groupMemberships[groupId];
  return { data: {}, status: 200 };
}

export function getMockRequestJoinGroup(
  groupId: string,
): ApiResponse<unknown> {
  if (!groupJoinRequests[groupId]) groupJoinRequests[groupId] = [];
  const user = MOCK_USERS[CURRENT_USER_ID];
  groupJoinRequests[groupId].push({
    id: `gjr-${Date.now()}`,
    groupId,
    userId: CURRENT_USER_ID,
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
    createdAt: new Date().toISOString(),
  });
  return { data: {}, status: 200 };
}

export function getMockGroupJoinRequests(
  groupId: string,
): ApiResponse<GroupJoinRequest[]> {
  return { data: groupJoinRequests[groupId] || [], status: 200 };
}

export function getMockAcceptJoinRequest(
  groupId: string,
  userId: string,
): ApiResponse<unknown> {
  if (!groupMemberships[groupId]) groupMemberships[groupId] = [];
  if (!groupMemberships[groupId].some((m) => m.userId === userId)) {
    groupMemberships[groupId].push({ userId, role: "member" });
  }
  if (groupJoinRequests[groupId]) {
    groupJoinRequests[groupId] = groupJoinRequests[groupId].filter(
      (r) => r.userId !== userId,
    );
  }
  return { data: {}, status: 200 };
}

export function getMockDeclineJoinRequest(
  groupId: string,
  userId: string,
): ApiResponse<unknown> {
  if (groupJoinRequests[groupId]) {
    groupJoinRequests[groupId] = groupJoinRequests[groupId].filter(
      (r) => r.userId !== userId,
    );
  }
  return { data: {}, status: 200 };
}

export function getMockInviteToGroup(
  groupId: string,
  userId: string,
): ApiResponse<unknown> {
  const group = MOCK_GROUPS.find((g) => g.id === groupId);
  const inviter = MOCK_USERS[CURRENT_USER_ID];
  if (!group) return { error: "Group not found", status: 404 };

  groupInvitations.push({
    id: `ginv-${Date.now()}`,
    groupId,
    groupName: group.name,
    inviterId: CURRENT_USER_ID,
    inviter: {
      firstName: inviter.firstName,
      lastName: inviter.lastName,
      avatarUrl: inviter.avatarUrl,
    },
    createdAt: new Date().toISOString(),
  });

  // Also create a notification for the invited user
  MOCK_NOTIFICATIONS.push({
    id: `notif-ginv-${Date.now()}`,
    type: "group_invitation",
    userId,
    actorId: CURRENT_USER_ID,
    actor: {
      firstName: inviter.firstName,
      lastName: inviter.lastName,
      avatarUrl: inviter.avatarUrl,
    },
    isRead: false,
    actionPending: true,
    createdAt: new Date().toISOString(),
    metadata: { groupId },
  });

  return { data: {}, status: 200 };
}

export function getMockGroupInvitations(): ApiResponse<GroupInvitation[]> {
  return { data: [...groupInvitations], status: 200 };
}

export function getMockAcceptGroupInvitation(
  groupId: string,
): ApiResponse<unknown> {
  if (!groupMemberships[groupId]) groupMemberships[groupId] = [];
  if (
    !groupMemberships[groupId].some((m) => m.userId === CURRENT_USER_ID)
  ) {
    groupMemberships[groupId].push({
      userId: CURRENT_USER_ID,
      role: "member",
    });
  }
  // Remove the invitation
  const idx = groupInvitations.findIndex(
    (inv) => inv.groupId === groupId,
  );
  if (idx !== -1) groupInvitations.splice(idx, 1);

  // Mark related notification as read
  const notif = MOCK_NOTIFICATIONS.find(
    (n) =>
      n.type === "group_invitation" && n.metadata?.groupId === groupId,
  );
  if (notif) notif.isRead = true;

  return { data: {}, status: 200 };
}

export function getMockDeclineGroupInvitation(
  groupId: string,
): ApiResponse<unknown> {
  const idx = groupInvitations.findIndex(
    (inv) => inv.groupId === groupId,
  );
  if (idx !== -1) groupInvitations.splice(idx, 1);

  const notif = MOCK_NOTIFICATIONS.find(
    (n) =>
      n.type === "group_invitation" && n.metadata?.groupId === groupId,
  );
  if (notif) notif.isRead = true;

  return { data: {}, status: 200 };
}

export function getMockGroupMembers(
  groupId: string,
): ApiResponse<GroupMember[]> {
  const members = (groupMemberships[groupId] || [])
    .map((m) => {
      const user = MOCK_USERS[m.userId];
      if (!user) return null;
      return {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        username: user.username,
        role: m.role,
      } as GroupMember;
    })
    .filter(Boolean) as GroupMember[];
  return { data: members, status: 200 };
}

export function getMockGroupPosts(groupId: string): ApiResponse<Post[]> {
  const postIds = Object.entries(groupPostMap)
    .filter(([, gId]) => gId === groupId)
    .map(([pId]) => pId);

  const posts = MOCK_GROUP_POSTS.filter((p) => postIds.includes(p.id)).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return { data: posts, status: 200 };
}

let mockGroupPostCounter = 100;

export function getMockCreateGroupPost(payload: {
  groupId: string;
  title: string;
  content: string;
  tags?: string[];
}): ApiResponse<Post> {
  const user = MOCK_USERS[CURRENT_USER_ID];
  const newPost: Post = {
    id: `gpost-new-${++mockGroupPostCounter}`,
    userId: CURRENT_USER_ID,
    title: payload.title,
    content: payload.content,
    privacy: "private",
    createdAt: new Date().toISOString(),
    author: {
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
    tags: payload.tags || [],
    commentCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    userReaction: null,
  };
  MOCK_GROUP_POSTS.unshift(newPost);
  groupPostMap[newPost.id] = payload.groupId;
  return { data: newPost, status: 201 };
}

export function getMockGroupEvents(
  groupId: string,
): ApiResponse<GroupEvent[]> {
  const events = MOCK_GROUP_EVENTS.filter((e) => e.groupId === groupId).map(
    (e) => ({
      ...e,
      myResponse: (eventResponses[e.id]?.[CURRENT_USER_ID] || null) as
        | "going"
        | "not_going"
        | null,
      goingCount: Object.values(eventResponses[e.id] || {}).filter(
        (r) => r === "going",
      ).length,
      notGoingCount: Object.values(eventResponses[e.id] || {}).filter(
        (r) => r === "not_going",
      ).length,
    }),
  );
  return { data: events, status: 200 };
}

let mockEventCounter = 100;

export function getMockCreateGroupEvent(payload: {
  groupId: string;
  title: string;
  description: string;
  dateTime: string;
}): ApiResponse<GroupEvent> {
  const user = MOCK_USERS[CURRENT_USER_ID];
  const newEvent: GroupEvent = {
    id: `event-new-${++mockEventCounter}`,
    groupId: payload.groupId,
    title: payload.title,
    description: payload.description,
    dateTime: payload.dateTime,
    createdBy: {
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
    options: [
      { id: `opt-new-${mockEventCounter}-a`, label: "Going", count: 0 },
      { id: `opt-new-${mockEventCounter}-b`, label: "Not Going", count: 0 },
    ],
    goingCount: 0,
    notGoingCount: 0,
  };
  MOCK_GROUP_EVENTS.push(newEvent);
  eventResponses[newEvent.id] = {};
  return { data: newEvent, status: 201 };
}

export function getMockRespondToGroupEvent(
  eventId: string,
  response: string,
): ApiResponse<unknown> {
  if (!eventResponses[eventId]) eventResponses[eventId] = {};
  const prev = eventResponses[eventId][CURRENT_USER_ID];

  if (prev === response) {
    // Toggle off
    delete eventResponses[eventId][CURRENT_USER_ID];
  } else {
    eventResponses[eventId][CURRENT_USER_ID] = response;
  }

  return { data: {}, status: 200 };
}

// ---- Chat ----

const MOCK_MESSAGES: ChatMessage[] = [
  // conv-private-1: dev-user-1 <-> user-2 (Sarah)
  {
    id: "msg-1",
    conversationId: "conv-private-1",
    senderId: "user-2",
    content: "Hey! Love the new glass design for Waves",
    createdAt: "2026-02-20T09:00:00Z",
    sender: { firstName: "Sarah", lastName: "Chen", avatarUrl: "https://i.pravatar.cc/150?u=user-2" },
  },
  {
    id: "msg-2",
    conversationId: "conv-private-1",
    senderId: "dev-user-1",
    content: "Thanks Sarah! Your color palette suggestions were super helpful",
    createdAt: "2026-02-20T09:05:00Z",
    sender: { firstName: "Dev", lastName: "User", avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1" },
  },
  {
    id: "msg-3",
    conversationId: "conv-private-1",
    senderId: "user-2",
    content: "Happy to help! Are we still on for the design review tomorrow?",
    createdAt: "2026-02-20T09:10:00Z",
    sender: { firstName: "Sarah", lastName: "Chen", avatarUrl: "https://i.pravatar.cc/150?u=user-2" },
  },
  {
    id: "msg-4",
    conversationId: "conv-private-1",
    senderId: "dev-user-1",
    content: "Absolutely! I'll have the chat feature ready by then",
    createdAt: "2026-02-20T09:15:00Z",
    sender: { firstName: "Dev", lastName: "User", avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1" },
  },
  {
    id: "msg-5",
    conversationId: "conv-private-1",
    senderId: "user-2",
    content: "That's awesome! Can't wait to see it in action",
    createdAt: "2026-02-20T09:20:00Z",
    sender: { firstName: "Sarah", lastName: "Chen", avatarUrl: "https://i.pravatar.cc/150?u=user-2" },
  },
  {
    id: "msg-6",
    conversationId: "conv-private-1",
    senderId: "dev-user-1",
    content: "It's going to look great with the orange theme",
    createdAt: "2026-02-20T09:25:00Z",
    sender: { firstName: "Dev", lastName: "User", avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1" },
  },
  // conv-private-2: dev-user-1 <-> user-5 (James)
  {
    id: "msg-7",
    conversationId: "conv-private-2",
    senderId: "user-5",
    content: "Did you see my GraphQL migration post?",
    createdAt: "2026-02-20T08:30:00Z",
    sender: { firstName: "James", lastName: "Wilson", avatarUrl: "https://i.pravatar.cc/150?u=user-5" },
  },
  {
    id: "msg-8",
    conversationId: "conv-private-2",
    senderId: "dev-user-1",
    content: "Yeah! 40% improvement is incredible. What was the bottleneck?",
    createdAt: "2026-02-20T08:35:00Z",
    sender: { firstName: "Dev", lastName: "User", avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1" },
  },
  {
    id: "msg-9",
    conversationId: "conv-private-2",
    senderId: "user-5",
    content: "Over-fetching mostly. DataLoader batching fixed the rest",
    createdAt: "2026-02-20T08:40:00Z",
    sender: { firstName: "James", lastName: "Wilson", avatarUrl: "https://i.pravatar.cc/150?u=user-5" },
  },
  {
    id: "msg-10",
    conversationId: "conv-private-2",
    senderId: "dev-user-1",
    content: "Nice. We should apply similar patterns to the Waves API",
    createdAt: "2026-02-20T08:45:00Z",
    sender: { firstName: "Dev", lastName: "User", avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1" },
  },
  // conv-group-1: Waves Dev Team
  {
    id: "msg-11",
    conversationId: "conv-group-1",
    senderId: "dev-user-1",
    content: "Team standup: Chat feature is in progress!",
    createdAt: "2026-02-20T10:00:00Z",
    sender: { firstName: "Dev", lastName: "User", avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1" },
  },
  {
    id: "msg-12",
    conversationId: "conv-group-1",
    senderId: "user-2",
    content: "Great! I'll start on the design assets",
    createdAt: "2026-02-20T10:05:00Z",
    sender: { firstName: "Sarah", lastName: "Chen", avatarUrl: "https://i.pravatar.cc/150?u=user-2" },
  },
  {
    id: "msg-13",
    conversationId: "conv-group-1",
    senderId: "user-5",
    content: "I can help with the WebSocket layer when the backend is ready",
    createdAt: "2026-02-20T10:10:00Z",
    sender: { firstName: "James", lastName: "Wilson", avatarUrl: "https://i.pravatar.cc/150?u=user-5" },
  },
  {
    id: "msg-14",
    conversationId: "conv-group-1",
    senderId: "dev-user-1",
    content: "Perfect. Let's sync after the sprint planning event tomorrow",
    createdAt: "2026-02-20T10:15:00Z",
    sender: { firstName: "Dev", lastName: "User", avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1" },
  },
  // conv-group-2: Photography Club
  {
    id: "msg-15",
    conversationId: "conv-group-2",
    senderId: "user-2",
    content: "Golden hour challenge starts now! Post your shots this week",
    createdAt: "2026-02-19T17:00:00Z",
    sender: { firstName: "Sarah", lastName: "Chen", avatarUrl: "https://i.pravatar.cc/150?u=user-2" },
  },
  {
    id: "msg-16",
    conversationId: "conv-group-2",
    senderId: "user-4",
    content: "I got some amazing sunset shots from Tokyo Tower yesterday!",
    createdAt: "2026-02-19T18:00:00Z",
    sender: { firstName: "Lina", lastName: "Park", avatarUrl: "https://i.pravatar.cc/150?u=user-4" },
  },
  {
    id: "msg-17",
    conversationId: "conv-group-2",
    senderId: "dev-user-1",
    content: "Tried manual focus today - harder than expected but worth it",
    createdAt: "2026-02-20T12:00:00Z",
    sender: { firstName: "Dev", lastName: "User", avatarUrl: "https://i.pravatar.cc/150?u=dev-user-1" },
  },
];

function buildConversations(): Conversation[] {
  return [
    {
      id: "conv-private-1",
      type: "private",
      participant: {
        userId: "user-2",
        firstName: "Sarah",
        lastName: "Chen",
        avatarUrl: "https://i.pravatar.cc/150?u=user-2",
      },
      lastMessage: { content: "It's going to look great with the orange theme", senderId: "dev-user-1", senderName: "Dev User", createdAt: "2026-02-20T09:25:00Z" },
      unreadCount: 2,
    },
    {
      id: "conv-private-2",
      type: "private",
      participant: {
        userId: "user-5",
        firstName: "James",
        lastName: "Wilson",
        avatarUrl: "https://i.pravatar.cc/150?u=user-5",
      },
      lastMessage: { content: "Nice. We should apply similar patterns to the Waves API", senderId: "dev-user-1", senderName: "Dev User", createdAt: "2026-02-20T08:45:00Z" },
      unreadCount: 1,
    },
    {
      id: "conv-group-1",
      type: "group",
      group: { groupId: "group-1", title: "Waves Dev Team", memberCount: 3 },
      lastMessage: { content: "Perfect. Let's sync after the sprint planning event tomorrow", senderId: "dev-user-1", senderName: "Dev User", createdAt: "2026-02-20T10:15:00Z" },
      unreadCount: 0,
    },
    {
      id: "conv-group-2",
      type: "group",
      group: { groupId: "group-2", title: "Photography Club", memberCount: 3 },
      lastMessage: { content: "Tried manual focus today - harder than expected but worth it", senderId: "dev-user-1", senderName: "Dev User", createdAt: "2026-02-20T12:00:00Z" },
      unreadCount: 0,
    },
  ];
}

// Auto-reply pools per user
const AUTO_REPLIES: Record<string, string[]> = {
  "user-2": [
    "That sounds great! Let me check my schedule",
    "Love it! The design is coming together nicely",
    "Good point. I'll update the mockups",
    "Sure, I'll send over the assets later today",
  ],
  "user-5": [
    "Makes sense. I'll look into the implementation",
    "Good idea! Let's discuss more in standup",
    "I can have that ready by end of day",
    "Already on it! Check the latest PR",
  ],
  "user-4": [
    "Thanks for sharing! That's really helpful",
    "Amazing shot! What settings did you use?",
    "I'll try that technique next time",
  ],
};

let mockMsgCounter = 100;

// Map conversationId → groupId for group conversations
const convGroupMap: Record<string, string> = {
  "conv-group-1": "group-1",
  "conv-group-2": "group-2",
};

export function getMockConversations(): ApiResponse<Conversation[]> {
  const convs = buildConversations().sort(
    (a, b) =>
      new Date(b.lastMessage?.createdAt || 0).getTime() -
      new Date(a.lastMessage?.createdAt || 0).getTime(),
  );
  return { data: convs, status: 200 };
}

export function getMockConversationMessages(
  conversationId: string,
): ApiResponse<ChatMessage[]> {
  const messages = MOCK_MESSAGES.filter(
    (m) => m.conversationId === conversationId,
  ).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return { data: messages, status: 200 };
}

export function getMockSendMessage(payload: {
  conversationId: string;
  content: string;
}): ApiResponse<ChatMessage> {
  const user = MOCK_USERS[CURRENT_USER_ID];
  const newMsg: ChatMessage = {
    id: `msg-new-${++mockMsgCounter}`,
    conversationId: payload.conversationId,
    senderId: CURRENT_USER_ID,
    content: payload.content,
    createdAt: new Date().toISOString(),
    sender: {
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
  };
  MOCK_MESSAGES.push(newMsg);
  return { data: newMsg, status: 201 };
}

export function getMockAutoReply(conversationId: string): ChatMessage | null {
  // Determine who should reply
  const conv = buildConversations().find((c) => c.id === conversationId);
  if (!conv) return null;

  let responderId: string;
  if (conv.type === "private" && conv.participant) {
    responderId = conv.participant.userId;
  } else if (conv.type === "group") {
    const groupId = convGroupMap[conversationId];
    if (!groupId) return null;
    const members = (groupMemberships[groupId] || [])
      .map((m) => m.userId)
      .filter((id) => id !== CURRENT_USER_ID);
    if (members.length === 0) return null;
    responderId = members[Math.floor(Math.random() * members.length)];
  } else {
    return null;
  }

  const responder = MOCK_USERS[responderId];
  if (!responder) return null;

  const pool = AUTO_REPLIES[responderId] || ["Sounds good!", "Got it!", "Thanks!"];
  const content = pool[Math.floor(Math.random() * pool.length)];

  const reply: ChatMessage = {
    id: `msg-new-${++mockMsgCounter}`,
    conversationId,
    senderId: responderId,
    content,
    createdAt: new Date().toISOString(),
    sender: {
      firstName: responder.firstName,
      lastName: responder.lastName,
      avatarUrl: responder.avatarUrl,
    },
  };
  MOCK_MESSAGES.push(reply);
  return reply;
}

export function getMockGetOrCreateConversation(
  userId: string,
): ApiResponse<Conversation> {
  const existing = buildConversations().find(
    (c) => c.type === "private" && c.participant?.userId === userId,
  );
  if (existing) return { data: existing, status: 200 };

  const targetUser = MOCK_USERS[userId];
  if (!targetUser) return { error: "User not found", status: 404 };

  const newConv: Conversation = {
    id: `conv-private-new-${Date.now()}`,
    type: "private",
    participant: {
      userId: targetUser.id,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      avatarUrl: targetUser.avatarUrl,
    },
    unreadCount: 0,
  };
  return { data: newConv, status: 201 };
}

export function getMockUnreadChatCount(): ApiResponse<{ count: number }> {
  const count = buildConversations().reduce((sum, c) => sum + c.unreadCount, 0);
  return { data: { count }, status: 200 };
}

// ---- Search ----

export function getMockSearch(query: string): ApiResponse<SearchResponse> {
  const q = query.toLowerCase().trim();
  if (!q) {
    return { data: { users: [], posts: [], groups: [] }, status: 200 };
  }

  const users = Object.values(MOCK_USERS).filter(
    (u) =>
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q),
  );

  const posts = MOCK_POSTS.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q)),
  );

  const groups = MOCK_GROUPS.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.tags?.some((t) => t.toLowerCase().includes(q)),
  );

  return { data: { users, posts, groups }, status: 200 };
}
