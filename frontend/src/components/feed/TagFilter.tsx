"use client";

import { useState, useEffect, useRef } from "react";
import { Chip, Input } from "@heroui/react";
import { getPopularTags, type PopularTag } from "@/lib/api";

interface TagFilterProps {
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function TagFilter({ selectedTag, onTagChange }: TagFilterProps) {
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPopularTags(10).then((res) => {
      if (res.data) setPopularTags(res.data);
    });
  }, []);

  // Close expanded search when clicking outside
  useEffect(() => {
    if (!isExpanded) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isExpanded]);

  function handleSearchSubmit(e: React.KeyboardEvent) {
    if (e.key === "Enter" && search.trim()) {
      const tag = search.trim().toLowerCase().replace(/^#+/, "");
      if (tag) {
        onTagChange(tag);
        setSearch("");
        setIsExpanded(false);
      }
    }
  }

  if (popularTags.length === 0 && !selectedTag) return null;

  return (
    <div ref={containerRef} className="glass-card rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-default-500 uppercase tracking-wider">
          {selectedTag ? "Filtered by tag" : "Popular tags"}
        </span>
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-default-400 hover:text-primary transition-colors p-1 rounded-lg hover:bg-default-100/50"
            aria-label="Search tags"
          >
            <SearchIcon />
          </button>
        )}
      </div>

      {isExpanded && (
        <Input
          value={search}
          onValueChange={setSearch}
          onKeyDown={handleSearchSubmit}
          placeholder="Search tag and press Enter..."
          variant="bordered"
          size="sm"
          autoFocus
          startContent={<SearchIcon />}
          classNames={{ inputWrapper: "glass-input h-8" }}
        />
      )}

      <div className="flex flex-wrap gap-1.5">
        {selectedTag && (
          <Chip
            size="sm"
            variant="solid"
            color="primary"
            onClose={() => onTagChange(null)}
            className="text-[11px]"
          >
            #{selectedTag}
          </Chip>
        )}
        {!selectedTag &&
          popularTags.map((t) => (
            <Chip
              key={t.tag}
              size="sm"
              variant="flat"
              color="default"
              className="text-[11px] cursor-pointer hover:bg-primary/15 hover:text-primary transition-colors"
              onClick={() => onTagChange(t.tag)}
            >
              #{t.tag}
            </Chip>
          ))}
      </div>
    </div>
  );
}
