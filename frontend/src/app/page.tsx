"use client";

import {
  Button,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { WaveBackground } from "@/components/WaveBackground";
import { HeroIllustration } from "@/components/HeroIllustration";
import { FeatureCards } from "@/components/FeatureCards";
import { StatsSection } from "@/components/StatsSection";
import { WaveDivider } from "@/components/WaveDivider";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation — Liquid Glass Navbar */}
      <Navbar maxWidth="xl" isBlurred isBordered>
        <NavbarBrand>
          <p className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Waves
          </p>
        </NavbarBrand>
        <NavbarContent justify="end">
          <NavbarItem>
            <ThemeSwitcher />
          </NavbarItem>
          <NavbarItem>
            <Button as={Link} href="/login" color="primary" variant="flat">
              Login
            </Button>
          </NavbarItem>
          <NavbarItem>
            <Button
              as={Link}
              href="/register"
              color="primary"
              variant="solid"
              className="shadow-md"
            >
              Sign Up
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <main className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center px-6 py-24">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />

          {/* Decorative blurred orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-40 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — Text Content */}
            <div className="text-center lg:text-left">
              <motion.h1
                className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                Ride the{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Wave
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 text-lg leading-8 text-default-500 max-w-lg mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              >
                Connect with friends, share your moments, and discover
                communities. Waves brings people together.
              </motion.p>

              <motion.div
                className="mt-10 flex items-center justify-center lg:justify-start gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              >
                <Button
                  as={Link}
                  href="/register"
                  color="primary"
                  size="lg"
                  variant="solid"
                  className="shadow-lg shadow-primary/30"
                >
                  Get Started
                </Button>
                <Button
                  color="secondary"
                  size="lg"
                  variant="bordered"
                  className="backdrop-blur-sm"
                >
                  Learn More
                </Button>
              </motion.div>
            </div>

            {/* Right — SVG Illustration (hidden on mobile) */}
            <motion.div
              className="hidden lg:flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            >
              <HeroIllustration />
            </motion.div>
          </div>

          {/* Animated waves at bottom */}
          <WaveBackground />
        </section>

        {/* Wave Divider → Features */}
        <WaveDivider className="fill-content1" />

        {/* Features Section */}
        <section className="bg-content1">
          <FeatureCards />
        </section>

        {/* Wave Divider → Stats */}
        <WaveDivider className="fill-content2" />

        {/* Stats Section */}
        <StatsSection />

        {/* Wave Divider → Footer */}
        <WaveDivider className="fill-background" />

        {/* Footer */}
        <footer className="py-12 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
              Waves
            </p>
            <p className="text-default-400 text-sm">
              &copy; 2026 Waves. Ride the wave together.
            </p>
          </motion.div>
        </footer>
      </main>
    </div>
  );
}
