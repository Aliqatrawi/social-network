"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { Button, Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";

import { FollowButton } from "@/components/profile/FollowButton";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { UserListModal } from "@/components/profile/UserListModal";
import { ActivityTimeline } from "@/components/profile/ActivityTimeline";
import {
  getUserProfile,
  getUserActivities,
  getUserFollowers,
  getUserFollowing,
  type ProfileResponse,
  type ActivityItem,
  type FollowUser,
  type User,
} from "@/lib/api";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user: currentUser, updateUser } = useAuth();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const activitiesRef = useRef<HTMLDivElement>(null);

  const isOwnProfile = currentUser?.id === id;

  const handleProfileUpdated = useCallback(
    (updatedUser: User) => {
      // Update the profile page UI
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: updatedUser.firstName,
              lastName: updatedUser.lastName,
              username: updatedUser.username,
              aboutMe: updatedUser.aboutMe,
              avatarUrl: updatedUser.avatarUrl,
              bannerUrl: updatedUser.bannerUrl,
              isPublic: updatedUser.isPublic,
            }
          : prev,
      );
      // Also update the auth context so the modal and sidebar stay in sync
      updateUser(updatedUser);
    },
    [updateUser],
  );

  function handleDeletePost(postId: string) {
    setActivities((prev) => prev.filter((a) => a.post.id !== postId));
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const profileResult = await getUserProfile(id);

    if (profileResult.error) {
      setError(profileResult.error);
      setIsLoading(false);
      return;
    }

    if (profileResult.data) {
      setProfile(profileResult.data);

      // Fetch activities, followers, following in parallel
      const [activitiesResult, followersResult, followingResult] =
        await Promise.all([
          getUserActivities(id),
          getUserFollowers(id),
          getUserFollowing(id),
        ]);

      setActivities(activitiesResult.data || []);
      setFollowers(followersResult.data || []);
      setFollowing(followingResult.data || []);
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-12 h-12 mx-auto text-default-300 mb-4"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <h2 className="text-lg font-semibold mb-1">User not found</h2>
        <p className="text-default-400 text-sm">
          {error || "This profile doesn't exist."}
        </p>
      </div>
    );
  }

  // Private profile gate: show limited info if not a follower and not own profile
  const isPrivateGated =
    !profile.isPublic && !profile.isFollowedByMe && !isOwnProfile;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Profile Header Card */}
      <Card className="glass-card shadow-xl overflow-hidden">
        <ProfileHeader profile={profile} />

        <div className="px-6 pb-6">
          <ProfileStats
            followersCount={profile.followersCount}
            followingCount={profile.followingCount}
            activitiesCount={activities.length}
            onFollowersClick={
              isPrivateGated ? undefined : () => setIsFollowersOpen(true)
            }
            onFollowingClick={
              isPrivateGated ? undefined : () => setIsFollowingOpen(true)
            }
            onActivitiesClick={
              isPrivateGated
                ? undefined
                : () =>
                    activitiesRef.current?.scrollIntoView({
                      behavior: "smooth",
                    })
            }
          />

          {/* Actions: Edit profile + Privacy toggle or Follow button */}
          {isOwnProfile ? (
            <div className="flex justify-end pt-2 mb-1">
              <Button
                variant="bordered"
                size="sm"
                className="backdrop-blur-sm"
                onPress={() => setIsEditOpen(true)}
                startContent={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                }
              >
                Edit Profile
              </Button>
            </div>
          ) : (
            <div className="flex justify-end pt-2">
              <FollowButton
                userId={id}
                isFollowing={profile.isFollowedByMe}
                isRequested={profile.isFollowRequested}
                onToggle={fetchData}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Activities / Private profile gate */}
      {isPrivateGated ? (
        <Card className="glass-card shadow-lg">
        <CardBody className="p-8 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10 mx-auto text-default-300 mb-3"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h3 className="font-semibold mb-1">This profile is private</h3>
          <p className="text-default-400 text-sm">
            Follow this user to see their activities and connections.
          </p>
        </CardBody>
        </Card>
      ) : (
        <Card className="glass-card shadow-lg" ref={activitiesRef}>
        <CardBody className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Activities</h2>
          <ActivityTimeline activities={activities} onDeletePost={handleDeletePost} />
        </CardBody>
        </Card>
      )}

      {/* Modals */}
      {isOwnProfile && currentUser && (
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          user={currentUser}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      <UserListModal
        isOpen={isFollowersOpen}
        onClose={() => setIsFollowersOpen(false)}
        users={followers}
        title="Followers"
      />

      <UserListModal
        isOpen={isFollowingOpen}
        onClose={() => setIsFollowingOpen(false)}
        users={following}
        title="Following"
      />
    </motion.div>
  );
}
