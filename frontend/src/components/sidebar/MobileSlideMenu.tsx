"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, Button } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useChat } from "@/context/ChatContext";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { SidebarNavItem } from "./SidebarNavItem";
import { showToast } from "@/lib/toast";

// ---- SVG Icons ----

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

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

interface MobileSlideMenuProps {
  className?: string;
}

export function MobileSlideMenu({ className = "" }: MobileSlideMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();

  const totalBadge = unreadCount + chatUnreadCount;

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const navItems = [
    { label: "Home", href: "/feed", icon: <HomeIcon /> },
    { label: "Search", href: "/search", icon: <SearchIcon /> },
    { label: "Profile", href: "/profile", icon: <ProfileIcon /> },
    { label: "Groups", href: "/groups", icon: <GroupsIcon /> },
    { label: "Chat", href: "/chat", icon: <ChatIcon />, badge: chatUnreadCount },
    { label: "Notifications", href: "/notifications", icon: <BellIcon />, badge: unreadCount },
  ];

  async function handleLogout() {
    setIsOpen(false);
    await logout();
    showToast({
      title: "Logged out",
      description: "See you next time!",
      color: "primary",
    });
    router.push("/login");
  }

  return (
    <div className={className}>
      {/* Hamburger button — fixed top-left */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-xl glass-card transition-all duration-200 active:scale-95"
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-foreground">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        {totalBadge > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-danger text-white text-[9px] font-bold rounded-full">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide drawer */}
      <aside
        className={`fixed left-0 top-0 h-full w-[280px] z-50 glass-sidebar flex flex-col p-6 transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header: Logo + Close + Theme */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Waves
          </h1>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-default-100/50 transition-colors"
              aria-label="Close menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={"badge" in item ? item.badge : undefined}
            />
          ))}
        </nav>

        {/* Bottom: User info + Logout */}
        <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
          {user && (
            <div className="flex items-center gap-3">
              <Avatar
                src={user.avatarUrl}
                name={`${user.firstName} ${user.lastName}`}
                size="sm"
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                {user.username && (
                  <p className="text-xs text-default-400 truncate">
                    @{user.username}
                  </p>
                )}
              </div>
            </div>
          )}
          <Button
            variant="light"
            size="sm"
            className="text-default-400 hover:text-danger justify-start gap-3"
            onPress={handleLogout}
            startContent={<LogoutIcon />}
          >
            Logout
          </Button>
        </div>
      </aside>
    </div>
  );
}
