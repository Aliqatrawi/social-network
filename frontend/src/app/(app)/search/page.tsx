"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@heroui/react";
import { motion } from "framer-motion";
import { search, type SearchResponse } from "@/lib/api";
import { SearchResults } from "@/components/search/SearchResults";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await search(q.trim());
    if (result.data) {
      setResults(result.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 max-w-2xl mx-auto"
    >
      <h1 className="text-2xl font-bold">Search</h1>

      <Input
        placeholder="Search users, posts, groups..."
        value={query}
        onValueChange={setQuery}
        variant="bordered"
        size="lg"
        startContent={<SearchIcon />}
        classNames={{
          inputWrapper: "glass-input",
        }}
        autoFocus
      />

      <SearchResults results={results} isLoading={isLoading} query={query} />
    </motion.div>
  );
}
