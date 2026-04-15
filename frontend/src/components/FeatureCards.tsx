"use client";

import { Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";

function ConnectIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
    </svg>
  );
}

const features = [
  {
    title: "Connect",
    description:
      "Find and follow friends. Build your network with public or private profiles.",
    icon: <ConnectIcon />,
  },
  {
    title: "Share",
    description:
      "Post moments with images and GIFs. Control who sees your content with privacy settings.",
    icon: <ShareIcon />,
  },
  {
    title: "Discover",
    description:
      "Explore groups and communities. Join events and meet people with shared interests.",
    icon: <DiscoverIcon />,
  },
  {
    title: "Chat",
    description:
      "Real-time messaging with friends and groups. Stay connected with instant notifications.",
    icon: <ChatIcon />,
  },
];

export function FeatureCards() {
  return (
    <section className="relative px-6 py-24 max-w-6xl mx-auto">
      <motion.h2
        className="text-3xl font-bold text-center mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
      >
        Everything you need
      </motion.h2>
      <motion.p
        className="text-center text-default-500 mb-12 max-w-lg mx-auto"
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        A complete platform to connect, share, and grow together.
      </motion.p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            className="h-full"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Card
              className="glass-card shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
            >
              <CardBody className="text-center p-6 flex flex-col items-center justify-start">
                <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary backdrop-blur-sm shrink-0">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-default-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
