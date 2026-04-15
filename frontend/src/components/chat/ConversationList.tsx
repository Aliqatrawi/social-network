"use client";

import { useMemo, useState } from "react";
import { Input } from "@heroui/react";
import { ConversationItem } from "./ConversationItem";
import { ConversationSkeletonList } from "@/components/skeletons/ConversationSkeleton";
import type { Conversation } from "@/lib/api";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 text-default-400"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function uniqueById(arr: Conversation[]) {
  const map = new Map<string, Conversation>();
  for (const c of arr) map.set(c.id, c);
  return Array.from(map.values());
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const base = uniqueById(conversations);
    if (!search.trim()) return base;

    const q = search.toLowerCase();
    return base.filter((conv) => {
      if (conv.type === "private") {
        const name = `${conv.participant?.firstName || ""} ${
          conv.participant?.lastName || ""
        }`.toLowerCase();
        return name.includes(q);
      }
      return (conv.group?.title || "").toLowerCase().includes(q);
    });
  }, [conversations, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/10">
        <h2 className="text-lg font-bold mb-3">Chat</h2>
        <Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search conversations..."
          variant="bordered"
          size="sm"
          startContent={<SearchIcon />}
          classNames={{
            inputWrapper: "glass-input",
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto chat-scroll">
        {isLoading ? (
          <ConversationSkeletonList count={6} />
        ) : filtered.length > 0 ? (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedId === conv.id}
              onSelect={() => onSelect(conv.id)}
            />
          ))
        ) : (
          <div className="text-center py-12 px-4">
            <p className="text-default-400 text-sm">
              {search ? "No conversations found" : "No conversations yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
