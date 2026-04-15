"use client";

import { Avatar, Card, CardBody } from "@heroui/react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { User } from "@/lib/api";

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/profile/${user.id}`}>
        <Card isPressable className="glass-card shadow-sm w-full">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={user.avatarUrl}
              name={`${user.firstName} ${user.lastName}`}
              size="md"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              {user.username && (
                <p className="text-xs text-default-400 truncate">
                  @{user.username}
                </p>
              )}
              {user.aboutMe && (
                <p className="text-xs text-default-500 line-clamp-1 mt-0.5">
                  {user.aboutMe}
                </p>
              )}
            </div>
          </div>
        </CardBody>
        </Card>
      </Link>
    </motion.div>
  );
}
