"use client";

import { PostCard } from "@/components/feed/PostCard";
import type { ActivityItem } from "@/lib/api";

interface ActivityTimelineProps {
  activities: ActivityItem[];
  onDeletePost?: (postId: string) => void;
}

function PostIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const typeIcons: Record<ActivityItem["type"], React.ReactNode> = {
  posted: <PostIcon />,
  commented: <CommentIcon />,
  reposted: <PostIcon />,
};

export function ActivityTimeline({ activities, onDeletePost }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-10 h-10 mx-auto text-default-300 mb-3"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <p className="text-default-400 text-sm">No activities yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id}>
          {/* Activity context label */}
          <div className="flex items-center gap-1.5 mb-2 ml-1 text-xs text-default-400">
            {typeIcons[activity.type]}
            <span>{activity.label}</span>
          </div>
          {/* Actual post card */}
          <PostCard post={activity.post} onDelete={onDeletePost} />
        </div>
      ))}
    </div>
  );
}
