"use client";

import DOMPurify from "dompurify";
import { useMemo, useRef, useState, useEffect } from "react";

const COLLAPSED_HEIGHT = 200;

interface RichTextRendererProps {
  content: string;
  format?: "plain" | "html";
}

export function RichTextRenderer({ content, format = "plain" }: RichTextRendererProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const sanitizedHtml = useMemo(() => {
    if (format !== "html") return "";

    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "b", "em", "i", "u", "s", "del",
        "h2", "h3", "ul", "ol", "li",
        "blockquote", "pre", "code",
        "hr", "img",
      ],
      ALLOWED_ATTR: ["src", "alt", "class", "width", "data-align", "style"],
      ALLOW_DATA_ATTR: false,
    });
  }, [content, format]);

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > COLLAPSED_HEIGHT);
    }
  }, [content, sanitizedHtml]);

  if (format !== "html") {
    return (
      <div>
        <div
          ref={contentRef}
          className="relative overflow-hidden"
          style={!expanded && isOverflowing ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
        >
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
          {!expanded && isOverflowing && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          )}
        </div>
        {isOverflowing && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-primary hover:text-primary-600 mt-1 transition-colors"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={contentRef}
        className="relative overflow-hidden"
        style={!expanded && isOverflowing ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
      >
        <div
          className="rich-text-content text-sm text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
        {!expanded && isOverflowing && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-primary hover:text-primary-600 mt-1 transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
