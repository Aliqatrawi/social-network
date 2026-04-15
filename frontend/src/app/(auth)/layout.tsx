import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { WaveBackground } from "@/components/WaveBackground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground">
      {/* Decorative blurred orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Theme switcher — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeSwitcher />
      </div>

      {/* Auth card container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Waves
            </span>
          </Link>
        </div>

        {/* Form content */}
        <div className="glass-card rounded-3xl p-8 shadow-xl">{children}</div>
      </div>

      {/* Static waves at bottom */}
      <WaveBackground />
    </div>
  );
}
