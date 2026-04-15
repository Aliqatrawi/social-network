"use client";

import { useState, useEffect } from "react";
import { Avatar, Button, Card, CardBody, Chip } from "@heroui/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { requestJoinGroup, type Group } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { useNotifications } from "@/context/NotificationContext";

interface GroupCardProps {
  group: Group;
  isMember: boolean;
  hasRequested?: boolean;
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function GroupCard({ group, isMember, hasRequested = false }: GroupCardProps) {
  const [requested, setRequested] = useState(hasRequested);
  const [isRequesting, setIsRequesting] = useState(false);
  const [memberNow, setMemberNow] = useState(isMember);
  const { onNewNotification } = useNotifications();

  // Listen for real-time "group_join_accepted" notification for this group
  useEffect(() => {
    return onNewNotification((notif) => {
      if (notif.type === "group_join_accepted" && notif.metadata?.groupId === group.id) {
        setMemberNow(true);
        setRequested(false);
      }
    });
  }, [onNewNotification, group.id]);

  async function handleRequestJoin() {
    setIsRequesting(true);
    const result = await requestJoinGroup(group.id);

    if (result.error) {
      showToast({ title: "Request failed", description: result.error, color: "danger" });
      setIsRequesting(false);
      return;
    }

    showToast({ title: "Request sent", color: "primary" });
    setRequested(true);
    setIsRequesting(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-card shadow-sm">
      <CardBody className="p-4">
      <div className="flex items-start gap-3">
        <Avatar
          src={group.imageUrl}
          name={group.name}
          size="md"
          className="shrink-0 bg-primary/20 text-primary"
        />
        <div className="flex-1 min-w-0">
          <Link
            href={`/groups/${group.id}`}
            className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1"
          >
            {group.name}
          </Link>
          <p className="text-xs text-default-400 line-clamp-2 mt-0.5">
            {group.description}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs text-default-500">
            <UsersIcon />
            <span>{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</span>
            <span className="mx-1">·</span>
            <span>by {group.creator.firstName} {group.creator.lastName}</span>
          </div>
          {group.tags && group.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {group.tags.map((tag) => (
                <Chip key={tag} size="sm" variant="flat" color="primary" className="text-[11px] italic">
                  #{tag}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {memberNow ? (
          <Button
            as={Link}
            href={`/groups/${group.id}`}
            size="sm"
            variant="flat"
            color="primary"
            className="shrink-0"
          >
            View
          </Button>
        ) : requested ? (
          <Button size="sm" variant="flat" isDisabled className="shrink-0">
            Requested
          </Button>
        ) : (
          <Button
            size="sm"
            color="primary"
            className="shrink-0"
            isLoading={isRequesting}
            onPress={handleRequestJoin}
          >
            Join
          </Button>
        )}
      </div>
      </CardBody>
      </Card>
    </motion.div>
  );
}
