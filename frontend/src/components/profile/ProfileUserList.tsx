"use client";

import { Avatar } from "@heroui/react";
import Link from "next/link";
import type { FollowUser } from "@/lib/api";

interface ProfileUserListProps {
  users: FollowUser[];
  emptyMessage: string;
}

export function ProfileUserList({ users, emptyMessage }: ProfileUserListProps) {
  if (users.length === 0) {
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
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <p className="text-default-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-default-200/50">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/profile/${user.id}`}
          className="flex items-center gap-3 px-2 py-3 rounded-xl transition-colors hover:bg-default-100/50"
        >
          <Avatar
            src={user.avatarUrl}
            name={`${user.firstName} ${user.lastName}`}
            size="sm"
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            {user.username && (
              <p className="text-xs text-default-400 truncate">
                @{user.username}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
