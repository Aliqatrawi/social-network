"use client";

import { useState } from "react";
import { Avatar, Button, Card, CardBody, Chip } from "@heroui/react";
import { requestJoinGroup, cancelJoinRequest, leaveGroup, type GroupDetailResponse } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface GroupHeaderProps {
  group: GroupDetailResponse;
  onUpdate?: () => void;
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

export function GroupHeader({ group, onUpdate }: GroupHeaderProps) {
  const [hasRequested, setHasRequested] = useState(group.hasRequested);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleRequestJoin() {
    setIsRequesting(true);
    const result = await requestJoinGroup(group.id);

    if (result.error) {
      showToast({ title: "Request failed", description: result.error, color: "danger" });
      setIsRequesting(false);
      return;
    }

    showToast({ title: "Request sent", color: "primary" });
    setHasRequested(true);
    setIsRequesting(false);
    onUpdate?.();
  }

  async function handleCancelRequest() {
    setIsCancelling(true);
    const result = await cancelJoinRequest(group.id);

    if (result.error) {
      showToast({ title: "Cancel failed", description: result.error, color: "danger" });
      setIsCancelling(false);
      return;
    }

    showToast({ title: "Request cancelled", color: "primary" });
    setHasRequested(false);
    setIsCancelling(false);
    onUpdate?.();
  }

  async function handleLeaveGroup() {
    setIsLeaving(true);
    const result = await leaveGroup(group.id);

    if (result.error) {
      showToast({ title: "Failed to leave", description: result.error, color: "danger" });
      setIsLeaving(false);
      return;
    }

    showToast({ title: "Left the group", color: "primary" });
    setIsLeaving(false);
    onUpdate?.();
  }

  return (
    <Card className="glass-card shadow-sm">
    <CardBody className="p-6">
      <div className="flex items-start gap-4">
        <Avatar
          src={group.imageUrl}
          name={group.name}
          size="lg"
          className="shrink-0 bg-primary/20 text-primary"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold">{group.name}</h2>
          <p className="text-sm text-default-500 mt-1">{group.description}</p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-default-500">
              <UsersIcon />
              <span>{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</span>
            </div>
            {group.isCreator && (
              <Chip size="sm" variant="flat" color="primary">Creator</Chip>
            )}
            {group.isMember && !group.isCreator && (
              <Chip size="sm" variant="flat" color="secondary">Member</Chip>
            )}
          </div>
          {group.tags && group.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {group.tags.map((tag) => (
                <Chip key={tag} size="sm" variant="flat" color="primary" className="text-[11px] italic">
                  #{tag}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {!group.isMember && !group.isCreator && (
          hasRequested ? (
            <Button
              size="sm"
              variant="flat"
              color="danger"
              className="shrink-0"
              isLoading={isCancelling}
              onPress={handleCancelRequest}
            >
              Cancel Request
            </Button>
          ) : (
            <Button
              size="sm"
              color="primary"
              className="shrink-0"
              isLoading={isRequesting}
              onPress={handleRequestJoin}
            >
              Request to Join
            </Button>
          )
        )}

        {group.isMember && !group.isCreator && (
          <Button
            size="sm"
            color="danger"
            variant="flat"
            className="shrink-0"
            isLoading={isLeaving}
            onPress={handleLeaveGroup}
          >
            Leave Group
          </Button>
        )}
      </div>
    </CardBody>
    </Card>
  );
}
