"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { MobileSlideMenu } from "@/components/sidebar/MobileSlideMenu";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Waves
        </h1>
        <Spinner color="primary" size="lg" />
      </div>
    </div>
  );
}

/** Ambient background: large soft gradient blobs + flowing wave strokes */
function BackgroundWaves() {
  return (
    <div className="app-bg-decor pointer-events-none" aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1400 900"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* ---- Gradient fills for ambient blobs ---- */}
          <radialGradient id="blob-orange" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF9B51" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FF9B51" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="blob-peach" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFBC7D" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FFBC7D" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="blob-gray" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#BFC9D1" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#BFC9D1" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="blob-warm" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF9B51" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#FFBC7D" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFBC7D" stopOpacity="0" />
          </radialGradient>

          {/* Soft edge blur for blobs */}
          <filter id="blob-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
          </filter>

          {/* ---- Glow filters for stroke waves ---- */}
          <filter id="glow-sm" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-md" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-lg" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ===== LAYER 1: Large soft gradient blobs — gives backdrop-filter content to blur ===== */}

        {/* Blob 1: Large warm orange — top right area */}
        <ellipse
          cx="1050" cy="200" rx="450" ry="350"
          fill="url(#blob-orange)"
          filter="url(#blob-blur)"
        />

        {/* Blob 2: Soft gray — center left */}
        <ellipse
          cx="250" cy="450" rx="400" ry="350"
          fill="url(#blob-gray)"
          filter="url(#blob-blur)"
        />

        {/* Blob 3: Peach — bottom right */}
        <ellipse
          cx="1000" cy="700" rx="500" ry="300"
          fill="url(#blob-peach)"
          filter="url(#blob-blur)"
        />

        {/* Blob 4: Warm gradient — top left corner */}
        <ellipse
          cx="200" cy="100" rx="350" ry="250"
          fill="url(#blob-warm)"
          filter="url(#blob-blur)"
        />

        {/* Blob 5: Subtle orange — bottom center */}
        <ellipse
          cx="650" cy="800" rx="400" ry="250"
          fill="url(#blob-orange)"
          filter="url(#blob-blur)"
          opacity="0.6"
        />

        {/* ===== LAYER 2: Flowing wave strokes for detail ===== */}

        {/* Wave 1: Large sweeping curve — top area, orange glow */}
        <path
          d="M-100,180 C200,80 400,280 700,160 C1000,40 1200,220 1500,140"
          fill="none"
          stroke="#FF9B51"
          strokeWidth="3"
          strokeOpacity="0.15"
          filter="url(#glow-md)"
        />

        {/* Wave 2: Parallel companion, softer */}
        <path
          d="M-100,210 C200,110 400,310 700,190 C1000,70 1200,250 1500,170"
          fill="none"
          stroke="#FF9B51"
          strokeWidth="2"
          strokeOpacity="0.10"
          filter="url(#glow-sm)"
        />

        {/* Wave 3: Mid-area flowing curve, gray glow */}
        <path
          d="M-50,400 C150,320 350,500 550,380 C750,260 950,440 1150,360"
          fill="none"
          stroke="#BFC9D1"
          strokeWidth="3.5"
          strokeOpacity="0.18"
          filter="url(#glow-md)"
        />

        {/* Wave 4: Companion to wave 3 */}
        <path
          d="M-50,435 C150,355 350,535 550,415 C750,295 950,475 1150,395"
          fill="none"
          stroke="#BFC9D1"
          strokeWidth="2"
          strokeOpacity="0.12"
          filter="url(#glow-sm)"
        />

        {/* Wave 5: Bottom wide orange sweep */}
        <path
          d="M-200,700 C100,600 400,780 700,650 C1000,520 1300,720 1600,640"
          fill="none"
          stroke="#FF9B51"
          strokeWidth="3"
          strokeOpacity="0.14"
          filter="url(#glow-lg)"
        />

        {/* Wave 6: Top-right decorative arc, peach */}
        <path
          d="M800,50 C900,120 1050,30 1200,100 C1350,170 1400,80 1500,110"
          fill="none"
          stroke="#FFBC7D"
          strokeWidth="2.5"
          strokeOpacity="0.14"
          filter="url(#glow-md)"
        />

        {/* Wave 7: Bottom-left tight curve, gray */}
        <path
          d="M50,750 C180,690 300,800 450,720 C600,640 700,760 850,700"
          fill="none"
          stroke="#BFC9D1"
          strokeWidth="2.5"
          strokeOpacity="0.14"
          filter="url(#glow-sm)"
        />

        {/* Wave 8: Diagonal sweep */}
        <path
          d="M-100,550 C200,480 500,620 800,500 C1100,380 1300,530 1500,470"
          fill="none"
          stroke="#FF9B51"
          strokeWidth="2"
          strokeOpacity="0.08"
          filter="url(#glow-lg)"
        />
      </svg>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen text-foreground">
      {/* Fixed SVG background — always mounted, never re-renders */}
      <BackgroundWaves />

      {isLoading ? (
        <LoadingScreen />
      ) : !isAuthenticated ? null : (
        <>
          {/* Desktop sidebar */}
          <Sidebar className="hidden lg:flex" />

          {/* Mobile slide menu */}
          <MobileSlideMenu className="lg:hidden" />

          {/* Main content */}
          <main className="relative lg:ml-[280px] min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pt-16 lg:pt-6">
              {children}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
