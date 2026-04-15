"use client";

import { useState, useEffect } from "react";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ChatProvider } from "@/context/ChatContext";
import { GroupProvider } from "@/context/GroupContext";

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      themes={["light", "dark"]}
    >
      <HeroUIProvider>
        <ToastProvider
          placement={isMobile ? "bottom-center" : "top-right"}
          maxVisibleToasts={1}
          toastOffset={20}
          regionProps={{
            classNames: {
              base: "z-[100]",
            },
          }}
        />
        <AuthProvider>
          <NotificationProvider>
            <GroupProvider>
              <ChatProvider>{children}</ChatProvider>
            </GroupProvider>
          </NotificationProvider>
        </AuthProvider>
      </HeroUIProvider>
    </NextThemesProvider>
  );
}
