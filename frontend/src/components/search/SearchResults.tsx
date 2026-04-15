"use client";

import { Card, CardBody } from "@heroui/react";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/feed/PostCard";
import { GroupCard } from "@/components/groups/GroupCard";
import { UserCard } from "./UserCard";
import { UserCardSkeletonList } from "@/components/skeletons/UserCardSkeleton";
import { PostCardSkeletonList } from "@/components/skeletons/PostCardSkeleton";
import { GroupCardSkeletonList } from "@/components/skeletons/GroupCardSkeleton";
import type { SearchResponse } from "@/lib/api";

interface SearchResultsProps {
  results: SearchResponse | null;
  isLoading: boolean;
  query: string;
}

function SearchEmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto text-default-300 mb-4">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-3">Users</h2>
          <UserCardSkeletonList count={2} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-3">Posts</h2>
          <PostCardSkeletonList count={2} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-3">Groups</h2>
          <GroupCardSkeletonList count={1} />
        </section>
      </div>
    );
  }

  if (!results || query.length < 2) {
    return (
      <Card className="glass-card">
      <CardBody className="p-8 text-center">
        <SearchEmptyIcon />
        <h3 className="font-semibold mb-1">Search Waves</h3>
        <p className="text-default-400 text-sm">
          Type at least 2 characters to search for users, posts, and groups.
        </p>
      </CardBody>
      </Card>
    );
  }

  const totalResults = results.users.length + results.posts.length + results.groups.length;

  if (totalResults === 0) {
    return (
      <Card className="glass-card">
      <CardBody className="p-8 text-center">
        <SearchEmptyIcon />
        <h3 className="font-semibold mb-1">No results found</h3>
        <p className="text-default-400 text-sm">
          No matches for &ldquo;{query}&rdquo;. Try a different search term.
        </p>
      </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users */}
      {results.users.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-3">
            Users ({results.users.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {results.users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Posts */}
      {results.posts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-3">
            Posts ({results.posts.length})
          </h2>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {results.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Groups */}
      {results.groups.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-3">
            Groups ({results.groups.length})
          </h2>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {results.groups.map((group) => (
                <GroupCard key={group.id} group={group} isMember={false} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  );
}
