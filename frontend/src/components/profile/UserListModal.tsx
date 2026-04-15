"use client";

import { useState, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Input,
} from "@heroui/react";
import { ProfileUserList } from "./ProfileUserList";
import type { FollowUser } from "@/lib/api";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: FollowUser[];
  title: string;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-default-400">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function UserListModal({ isOpen, onClose, users, title }: UserListModalProps) {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
  }, [users, search]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      scrollBehavior="inside"
      size="md"
      disableAnimation
    >
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody className="pb-6 gap-4">
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
            variant="bordered"
            size="sm"
            classNames={{ inputWrapper: "glass-input" }}
            startContent={<SearchIcon />}
            isClearable
            onClear={() => setSearch("")}
          />
          <ProfileUserList
            users={filteredUsers}
            emptyMessage={
              search
                ? "No users match your search."
                : `No ${title.toLowerCase()} yet.`
            }
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
