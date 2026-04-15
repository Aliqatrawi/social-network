"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { followUser, unfollowUser, cancelFollowRequest } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  isRequested: boolean;
  onToggle?: () => void;
}

export function FollowButton({
  userId,
  isFollowing,
  isRequested,
  onToggle,
}: FollowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleFollow() {
    setIsLoading(true);
    const result = await followUser(userId);

    if (result.error) {
      showToast({
        title: "Action failed",
        description: result.error,
        color: "danger",
      });
      setIsLoading(false);
      return;
    }

    showToast({
      title: result.data?.status === "requested" ? "Request sent" : "Following",
      description:
        result.data?.status === "requested"
          ? "Waiting for the user to accept your request."
          : "You are now following this user.",
      color: "success",
    });
    onToggle?.();
    setIsLoading(false);
  }

  async function handleUnfollow() {
    setIsLoading(true);
    const result = await unfollowUser(userId);

    if (result.error) {
      showToast({
        title: "Action failed",
        description: result.error,
        color: "danger",
      });
      setIsLoading(false);
      return;
    }

    showToast({
      title: "Unfollowed",
      description: "You are no longer following this user.",
      color: "primary",
    });
    onToggle?.();
    setIsLoading(false);
  }

  async function handleCancelRequest() {
    setIsLoading(true);
    const result = await cancelFollowRequest(userId);

    if (result.error) {
      showToast({
        title: "Action failed",
        description: result.error,
        color: "danger",
      });
      setIsLoading(false);
      return;
    }

    showToast({
      title: "Request cancelled",
      description: "Your follow request has been withdrawn.",
      color: "primary",
    });
    onToggle?.();
    setIsLoading(false);
  }

  if (isRequested) {
    return (
      <Button
        variant="bordered"
        color="warning"
        size="sm"
        isLoading={isLoading}
        onPress={handleCancelRequest}
        className="font-medium"
      >
        Requested
      </Button>
    );
  }

  if (isFollowing) {
    return (
      <Button
        variant="bordered"
        color="default"
        size="sm"
        isLoading={isLoading}
        onPress={handleUnfollow}
        className="font-medium"
      >
        Following
      </Button>
    );
  }

  return (
    <Button
      variant="solid"
      color="primary"
      size="sm"
      isLoading={isLoading}
      onPress={handleFollow}
      className="font-medium shadow-md shadow-primary/20"
    >
      Follow
    </Button>
  );
}
