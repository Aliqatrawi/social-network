"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import { showToast } from "@/lib/toast";

// ---- Compact SVG Icons ----

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const navItems = [
  { label: "Home", href: "/feed" as const, icon: <HomeIcon /> },
  { label: "Search", href: "/search" as const, icon: <SearchIcon /> },
  { label: "Groups", href: "/groups" as const, icon: <GroupsIcon /> },
  { label: "Chat", href: "/chat" as const, icon: <ChatIcon /> },
  { label: "Alerts", href: "/notifications" as const, icon: <BellIcon /> },
  { label: "Profile", href: "/profile" as const, icon: <ProfileIcon /> },
];

interface MobileBottomBarProps {
  className?: string;
}

export function MobileBottomBar({ className = "" }: MobileBottomBarProps) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    showToast({
      title: "Logged out",
      description: "See you next time!",
      color: "primary",
    });
    router.push("/login");
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 glass-bottombar flex items-center justify-around h-16 px-2 ${className}`}
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/feed" && pathname.startsWith(item.href));

        const showBadge = item.href === "/notifications" && unreadCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl
              transition-all duration-200 relative
              ${
                isActive
                  ? "text-primary"
                  : "text-default-400 hover:text-foreground"
              }
            `}
          >
            <span className={isActive ? "text-primary" : ""}>{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
            {showBadge && (
              <span className="absolute top-0 right-1 w-4 h-4 flex items-center justify-center bg-danger text-white text-[8px] font-bold rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
      
      {/* Menu Dropdown */}
      <Dropdown placement="top">
        <DropdownTrigger>
          <Button
            isIconOnly
            variant="light"
            className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl text-default-400 hover:text-foreground"
          >
            <MenuIcon />
            <span className="text-[10px] font-medium">Menu</span>
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Mobile menu actions">
          <DropdownItem
            key="logout"
            color="danger"
            startContent={<LogoutIcon />}
            onPress={handleLogout}
          >
            Logout
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </nav>
  );
}
