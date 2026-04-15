"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Avatar,
  Button,
  Input,
  Tab,
  Tabs,
} from "@heroui/react";
import {
  search,
  inviteToGroup,
  getGroupMembers,
  getUserFollowing,
  type User,
  type GroupMember,
  type FollowUser,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { showToast } from "@/lib/toast";
import { MemberSkeletonList } from "@/components/skeletons/MemberSkeleton";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-default-400">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

interface InviteableUser {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  avatarUrl?: string;
}

export function InviteMemberModal({ isOpen, onClose, groupId }: InviteMemberModalProps) {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<string>("followers");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMembers = useCallback(async () => {
    const result = await getGroupMembers(groupId);
    if (result.data) {
      setMemberIds(new Set(result.data.map((m: GroupMember) => m.userId)));
    }
  }, [groupId]);

  const loadFollowing = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingFollowers(true);
    const result = await getUserFollowing(currentUser.id);
    if (result.data) {
      setFollowers(result.data);
    }
    setIsLoadingFollowers(false);
  }, [currentUser]);

  const searchAllUsers = useCallback(async (q: string) => {
    setIsLoadingAll(true);
    const result = await search(q || "a");
    if (result.data) {
      setAllUsers(result.data.users || []);
    }
    setIsLoadingAll(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setInvitedIds(new Set());
      setQuery("");
      setTab("followers");
      loadMembers();
      loadFollowing();
    }
  }, [isOpen, loadMembers, loadFollowing]);

  // Load all users when switching to "All" tab for the first time
  useEffect(() => {
    if (isOpen && tab === "all" && allUsers.length === 0) {
      searchAllUsers("");
    }
  }, [isOpen, tab, allUsers.length, searchAllUsers]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (tab === "all") {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        searchAllUsers(value);
      }, 300);
    }
  }

  async function handleInvite(userId: string) {
    setInvitingId(userId);
    const result = await inviteToGroup(groupId, userId);

    if (result.error) {
      showToast({ title: "Invite failed", description: result.error, color: "danger" });
      setInvitingId(null);
      return;
    }

    showToast({ title: "Invitation sent", color: "success" });
    setInvitedIds((prev) => new Set(prev).add(userId));
    setInvitingId(null);
  }

  // Filter out existing members and current user
  const filterUsers = (list: InviteableUser[]) =>
    list.filter((u) => !memberIds.has(u.id) && u.id !== currentUser?.id);

  const filteredFollowers = filterUsers(followers).filter(
    (u) =>
      !query ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredAll = filterUsers(allUsers);

  const displayList: InviteableUser[] = tab === "followers" ? filteredFollowers : filteredAll;
  const isLoading = tab === "followers" ? isLoadingFollowers : isLoadingAll;

  function renderUserList(users: InviteableUser[], loading: boolean) {
    if (loading) return <MemberSkeletonList count={4} />;

    if (users.length === 0) {
      return (
        <p className="text-default-400 text-sm text-center py-4">
          {query ? "No users found." : tab === "followers" ? "No followers to invite." : "No users available to invite."}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {users.map((person) => (
          <div key={person.id} className="flex items-center gap-3 p-2 rounded-xl">
            <Avatar
              src={person.avatarUrl}
              name={`${person.firstName} ${person.lastName}`}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {person.firstName} {person.lastName}
              </p>
              {person.username && (
                <p className="text-xs text-default-400 truncate">@{person.username}</p>
              )}
            </div>
            {invitedIds.has(person.id) ? (
              <Button size="sm" variant="flat" isDisabled>
                Invited
              </Button>
            ) : (
              <Button
                size="sm"
                color="primary"
                isLoading={invitingId === person.id}
                onPress={() => handleInvite(person.id)}
              >
                Invite
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" scrollBehavior="inside" disableAnimation>
      <ModalContent>
        <ModalHeader>Invite Members</ModalHeader>
        <ModalBody className="pb-6">
          <Tabs
            selectedKey={tab}
            onSelectionChange={(key) => setTab(key as string)}
            variant="underlined"
            fullWidth
            classNames={{ tabList: "gap-4" }}
          >
            <Tab key="followers" title="Following" />
            <Tab key="all" title="All Users" />
          </Tabs>

          <Input
            placeholder={tab === "followers" ? "Filter following..." : "Search all users..."}
            value={query}
            onValueChange={handleQueryChange}
            startContent={<SearchIcon />}
            size="sm"
            variant="flat"
            classNames={{ inputWrapper: "bg-default-100" }}
          />

          {renderUserList(displayList, isLoading)}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
