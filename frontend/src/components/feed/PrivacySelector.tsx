"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";

type Privacy = "public" | "almost_private" | "private";

interface PrivacySelectorProps {
  value: Privacy;
  onChange: (value: Privacy) => void;
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
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

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const options: { key: Privacy; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: "public",
    label: "Public",
    description: "Everyone can see",
    icon: <GlobeIcon />,
  },
  {
    key: "almost_private",
    label: "Followers",
    description: "Only your followers",
    icon: <UsersIcon />,
  },
  {
    key: "private",
    label: "Private",
    description: "Chosen followers only",
    icon: <LockIcon />,
  },
];

export function PrivacySelector({ value, onChange }: PrivacySelectorProps) {
  const current = options.find((o) => o.key === value) || options[0];

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="flat"
          size="sm"
          startContent={current.icon}
          className="text-default-600 font-medium"
        >
          {current.label}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Post privacy"
        selectionMode="single"
        selectedKeys={new Set([value])}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as Privacy;
          if (selected) onChange(selected);
        }}
      >
        {options.map((opt) => (
          <DropdownItem
            key={opt.key}
            description={opt.description}
            startContent={opt.icon}
          >
            {opt.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
