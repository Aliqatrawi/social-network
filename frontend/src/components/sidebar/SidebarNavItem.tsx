"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

export function SidebarNavItem({ href, label, icon, badge }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/feed" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        transition-all duration-200 group relative
        ${
          isActive
            ? "bg-primary/15 text-primary font-semibold shadow-sm"
            : "text-default-600 hover:bg-default-100/50 hover:text-foreground"
        }
      `}
    >
      <span
        className={`w-5 h-5 shrink-0 transition-colors relative ${
          isActive ? "text-primary" : "text-default-400 group-hover:text-foreground"
        }`}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-danger text-white text-[9px] font-bold rounded-full">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}
