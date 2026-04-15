"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

function WaveScene() {
  return (
    <svg
      viewBox="0 0 400 200"
      className="w-80 h-40 mx-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bottle floating on waves */}
      <motion.g
        animate={{ y: [0, -6, 0], rotate: [0, 5, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Bottle body */}
        <rect
          x="175"
          y="65"
          width="30"
          height="50"
          rx="8"
          className="fill-primary/30 stroke-primary"
          strokeWidth="2"
        />
        {/* Bottle neck */}
        <rect
          x="185"
          y="52"
          width="10"
          height="16"
          rx="3"
          className="fill-primary/30 stroke-primary"
          strokeWidth="2"
        />
        {/* Cork */}
        <rect
          x="184"
          y="47"
          width="12"
          height="8"
          rx="2"
          className="fill-warning stroke-warning"
          strokeWidth="1.5"
        />
        {/* Paper inside */}
        <rect
          x="183"
          y="72"
          width="14"
          height="18"
          rx="2"
          className="fill-white/80"
        />
        {/* "404" text on paper */}
        <text
          x="190"
          y="85"
          textAnchor="middle"
          className="fill-primary"
          fontSize="8"
          fontWeight="bold"
        >
          404
        </text>
      </motion.g>

      {/* Water wave 1 */}
      <motion.path
        d="M0 130 Q50 110 100 130 Q150 150 200 130 Q250 110 300 130 Q350 150 400 130 L400 200 L0 200 Z"
        className="fill-primary/15"
        animate={{
          d: [
            "M0 130 Q50 110 100 130 Q150 150 200 130 Q250 110 300 130 Q350 150 400 130 L400 200 L0 200 Z",
            "M0 130 Q50 150 100 130 Q150 110 200 130 Q250 150 300 130 Q350 110 400 130 L400 200 L0 200 Z",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />

      {/* Water wave 2 */}
      <motion.path
        d="M0 145 Q60 125 120 145 Q180 165 240 145 Q300 125 360 145 Q390 155 400 145 L400 200 L0 200 Z"
        className="fill-primary/10"
        animate={{
          d: [
            "M0 145 Q60 125 120 145 Q180 165 240 145 Q300 125 360 145 Q390 155 400 145 L400 200 L0 200 Z",
            "M0 145 Q60 165 120 145 Q180 125 240 145 Q300 165 360 145 Q390 135 400 145 L400 200 L0 200 Z",
          ],
        }}
        transition={{ duration: 3.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />

      {/* Water wave 3 (front) */}
      <motion.path
        d="M0 160 Q70 145 140 160 Q210 175 280 160 Q350 145 400 160 L400 200 L0 200 Z"
        className="fill-primary/20"
        animate={{
          d: [
            "M0 160 Q70 145 140 160 Q210 175 280 160 Q350 145 400 160 L400 200 L0 200 Z",
            "M0 160 Q70 175 140 160 Q210 145 280 160 Q350 175 400 160 L400 200 L0 200 Z",
          ],
        }}
        transition={{ duration: 2.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Theme switcher */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcher />
      </div>

      {/* Decorative blurred orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Illustration */}
          <WaveScene />

          {/* Error code */}
          <motion.h1
            className="text-7xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mt-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            404
          </motion.h1>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-xl font-semibold mt-4 mb-2">
              Lost at sea
            </h2>
            <p className="text-default-500 text-sm leading-relaxed mb-8">
              This page drifted away with the tide. Let&apos;s get you back to
              familiar waters.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              as={Link}
              href="/"
              color="primary"
              size="lg"
              variant="solid"
              className="shadow-lg shadow-primary/30 font-semibold"
            >
              Back to Shore
            </Button>
            <Button
              as={Link}
              href="/login"
              color="default"
              size="lg"
              variant="bordered"
              className="font-semibold backdrop-blur-sm"
            >
              Login
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
