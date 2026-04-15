"use client";

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-12 h-12 mx-auto text-default-300 mb-4"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ChatEmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <ChatIcon />
        <h3 className="font-semibold mb-1">Your messages</h3>
        <p className="text-default-400 text-sm">
          Select a conversation to start chatting
        </p>
      </div>
    </div>
  );
}
