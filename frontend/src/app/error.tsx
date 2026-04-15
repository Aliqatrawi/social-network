"use client";

import { useEffect } from "react";
import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

function BrokenWaveScene() {
  return (
    <svg
      viewBox="0 0 400 200"
      className="w-80 h-40 mx-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Lightning bolt / crack */}
      <motion.path
        d="M200 20 L190 60 L210 60 L185 100 L195 80 L175 80 L200 20"
        className="fill-warning stroke-warning/60"
        strokeWidth="1"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0.7, 1], scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Broken wave 1 — left fragment */}
      <path
        d="M0 140 Q40 120 80 140 Q120 160 160 140 L160 145 L155 150"
        className="stroke-primary/30"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Gap / break in the wave */}

      {/* Broken wave 2 — right fragment */}
      <path
        d="M230 150 L235 140 Q280 120 320 140 Q360 160 400 140"
        className="stroke-primary/30"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Scattered droplets */}
      <motion.circle
        cx="180"
        cy="135"
        r="3"
        className="fill-primary/30"
        animate={{ y: [0, -15, 0], opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="200"
        cy="130"
        r="2"
        className="fill-primary/20"
        animate={{ y: [0, -10, 0], opacity: [1, 0.4, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle
        cx="215"
        cy="138"
        r="2.5"
        className="fill-primary/25"
        animate={{ y: [0, -12, 0], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.6 }}
      />
      <motion.circle
        cx="190"
        cy="145"
        r="1.5"
        className="fill-secondary/30"
        animate={{ y: [0, -8, 0], opacity: [1, 0.3, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.5 }}
      />

      {/* Water base */}
      <path
        d="M0 170 Q100 160 200 170 Q300 180 400 170 L400 200 L0 200 Z"
        className="fill-primary/10"
      />
    </svg>
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Theme switcher */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcher />
      </div>

      {/* Decorative blurred orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-danger/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Illustration */}
          <BrokenWaveScene />

          {/* Error icon */}
          <motion.div
            className="mx-auto mt-6 w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2, type: "spring" }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-danger"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h1 className="text-2xl font-bold mt-4 mb-2">
              Something went wrong
            </h1>
            <p className="text-default-500 text-sm leading-relaxed mb-2">
              A wave crashed unexpectedly. Don&apos;t worry, these things
              happen.
            </p>
            {error.digest && (
              <p className="text-default-400 text-xs font-mono mb-6">
                Error ID: {error.digest}
              </p>
            )}
            {!error.digest && <div className="mb-6" />}
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              color="primary"
              size="lg"
              variant="solid"
              className="shadow-lg shadow-primary/30 font-semibold"
              onPress={reset}
            >
              Try Again
            </Button>
            <Button
              as={Link}
              href="/"
              color="default"
              size="lg"
              variant="bordered"
              className="font-semibold backdrop-blur-sm"
            >
              Go Home
            </Button>
          </motion.div>

          {/* Logo */}
          <motion.p
            className="mt-12 text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Waves
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
