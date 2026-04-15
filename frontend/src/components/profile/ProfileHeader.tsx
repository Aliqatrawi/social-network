"use client";

import { Avatar, Chip } from "@heroui/react";
import { motion } from "framer-motion";
import type { ProfileResponse } from "@/lib/api";

interface ProfileHeaderProps {
  profile: ProfileResponse;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="relative">
      {/* Cover banner */}
      {profile.bannerUrl ? (
        <div className="h-36 sm:h-44 rounded-t-3xl overflow-hidden">
          <img
            src={profile.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="profile-cover h-36 sm:h-44 rounded-t-3xl" />
      )}

      {/* Avatar + Info */}
      <div className="px-6 pb-2 -mt-12 sm:-mt-14">
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Avatar
              src={profile.avatarUrl}
              name={`${profile.firstName} ${profile.lastName}`}
              className="w-24 h-24 sm:w-28 sm:h-28 text-large ring-4 ring-background shadow-lg"
            />
          </motion.div>

          <div className="flex-1 min-w-0 mt-14 sm:mt-16">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {profile.firstName} {profile.lastName}
              </h1>
              <Chip
                size="sm"
                variant="flat"
                color={profile.isPublic ? "primary" : "default"}
                className="shrink-0"
              >
                {profile.isPublic ? "Public" : "Private"}
              </Chip>
            </div>
            {profile.username && (
              <p className="text-default-400 text-sm">@{profile.username}</p>
            )}
            {profile.email && (
              <div className="flex items-center gap-1.5 mt-1 text-default-400 text-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 shrink-0"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>{profile.email}</span>
              </div>
            )}
            {profile.dateOfBirth && (
              <div className="flex items-center gap-1.5 mt-1 text-default-400 text-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 shrink-0"
                >
                  <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
                  <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
                  <path d="M2 21h20" />
                  <path d="M7 8v3" />
                  <path d="M12 8v3" />
                  <path d="M17 8v3" />
                  <path d="M7 4h.01" />
                  <path d="M12 4h.01" />
                  <path d="M17 4h.01" />
                </svg>
                <span>
                  Born{" "}
                  {new Date(profile.dateOfBirth).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* About me */}
        {profile.aboutMe && (
          <motion.p
            className="mt-4 text-sm text-default-600 leading-relaxed"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {profile.aboutMe}
          </motion.p>
        )}
      </div>
    </div>
  );
}
