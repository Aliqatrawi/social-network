"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";

export default function OwnProfileRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(`/profile/${user.id}`);
    }
  }, [isLoading, user, router]);

  return <ProfileSkeleton />;
}
