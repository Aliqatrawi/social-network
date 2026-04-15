"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, Button, Card, CardBody, Chip } from "@heroui/react";
import Link from "next/link";
import {
  getGroupMembers,
  getGroupJoinRequests,
  acceptJoinRequest,
  declineJoinRequest,
  kickMember,
  type GroupMember,
  type GroupJoinRequest,
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import { InviteMemberModal } from "./InviteMemberModal";
import { MemberSkeletonList } from "@/components/skeletons/MemberSkeleton";

interface MemberListProps {
  groupId: string;
  isCreator: boolean;
  isMember: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function MemberList({ groupId, isCreator, isMember }: MemberListProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [membersResult, requestsResult] = await Promise.all([
      getGroupMembers(groupId),
      isCreator ? getGroupJoinRequests(groupId) : Promise.resolve({ data: [] as GroupJoinRequest[], status: 200 }),
    ]);
    if (membersResult.data) setMembers(membersResult.data);
    if (requestsResult.data) setJoinRequests(requestsResult.data);
    setIsLoading(false);
  }, [groupId, isCreator]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAcceptRequest(userId: string) {
    const result = await acceptJoinRequest(groupId, userId);
    if (result.error) {
      showToast({ title: "Action failed", description: result.error, color: "danger" });
      return;
    }
    showToast({ title: "Request accepted", color: "success" });
    await loadData();
  }

  async function handleDeclineRequest(userId: string) {
    const result = await declineJoinRequest(groupId, userId);
    if (result.error) {
      showToast({ title: "Action failed", description: result.error, color: "danger" });
      return;
    }
    showToast({ title: "Request declined", color: "primary" });
    await loadData();
  }

  async function handleKickMember(memberId: string, memberName: string) {
    const result = await kickMember(groupId, memberId);
    if (result.error) {
      showToast({ title: "Action failed", description: result.error, color: "danger" });
      return;
    }
    showToast({ title: "Member removed", description: `${memberName} has been removed from the group.`, color: "success" });
    await loadData();
  }

  if (isLoading) {
    return <MemberSkeletonList count={6} />;
  }

  return (
    <div className="space-y-4">
      {/* Join requests (creator only) */}
      {isCreator && joinRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-default-600">Pending Requests</h3>
          <Card className="glass-card">
          <CardBody className="p-3 space-y-2">
            {joinRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-2 rounded-xl bg-warning/10">
                <Link href={`/profile/${req.userId}`}>
                  <Avatar
                    src={req.user.avatarUrl}
                    name={`${req.user.firstName} ${req.user.lastName}`}
                    size="sm"
                    className="cursor-pointer"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${req.userId}`}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {req.user.firstName} {req.user.lastName}
                  </Link>
                  <p className="text-xs text-default-400">{formatRelativeTime(req.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" color="primary" onPress={() => handleAcceptRequest(req.userId)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="flat" onPress={() => handleDeclineRequest(req.userId)}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
          </Card>
        </div>
      )}

      {/* Invite button */}
      {isMember && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            startContent={<PlusIcon />}
            onPress={() => setIsInviteOpen(true)}
          >
            Invite
          </Button>
        </div>
      )}

      {/* Members grid */}
      <Card className="glass-card">
      <CardBody className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-default-100/50 transition-colors"
            >
              <Link href={`/profile/${member.userId}`} className="shrink-0">
                <Avatar
                  src={member.avatarUrl}
                  name={`${member.firstName} ${member.lastName}`}
                  size="sm"
                  className="cursor-pointer"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${member.userId}`}
                  className="text-sm font-medium truncate hover:text-primary transition-colors block"
                >
                  {member.firstName} {member.lastName}
                </Link>
                {member.username && (
                  <p className="text-xs text-default-400 truncate">@{member.username}</p>
                )}
              </div>
              {member.role === "creator" && (
                <Chip size="sm" variant="flat" color="primary" className="text-[10px] shrink-0">
                  Creator
                </Chip>
              )}
              {isCreator && member.role !== "creator" && (
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  className="shrink-0 min-w-0 px-2"
                  onPress={() => handleKickMember(member.userId, `${member.firstName} ${member.lastName}`)}
                >
                  Kick
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardBody>
      </Card>

      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        groupId={groupId}
      />
    </div>
  );
}
