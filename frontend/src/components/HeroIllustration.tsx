"use client";

import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const avatarVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const pathVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.2, ease: "easeInOut" as const },
  },
};

interface PersonNodeProps {
  cx: number;
  cy: number;
  r: number;
  color: "primary" | "secondary";
  id: string;
}

function PersonNode({ cx, cy, r, color, id }: PersonNodeProps) {
  const fillClass = color === "primary" ? "fill-primary" : "fill-secondary";
  const strokeClass =
    color === "primary" ? "stroke-primary" : "stroke-secondary";

  return (
    <motion.g variants={avatarVariants}>
      {/* Outer glow ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r + 8}
        className={fillClass}
        fillOpacity="0.1"
      />

      {/* Avatar background circle */}
      <clipPath id={`clip-${id}`}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>

      <circle
        cx={cx}
        cy={cy}
        r={r}
        className={fillClass}
        fillOpacity="0.2"
      />

      {/* Person silhouette — head */}
      <circle
        cx={cx}
        cy={cy - r * 0.2}
        r={r * 0.3}
        className={fillClass}
        fillOpacity="0.7"
        clipPath={`url(#clip-${id})`}
      />

      {/* Person silhouette — shoulders/body */}
      <ellipse
        cx={cx}
        cy={cy + r * 0.55}
        rx={r * 0.5}
        ry={r * 0.4}
        className={fillClass}
        fillOpacity="0.7"
        clipPath={`url(#clip-${id})`}
      />

      {/* Subtle border ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        className={strokeClass}
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
    </motion.g>
  );
}

const people: PersonNodeProps[] = [
  { cx: 100, cy: 100, r: 22, color: "primary", id: "p1" },
  { cx: 230, cy: 90, r: 26, color: "secondary", id: "p2" },
  { cx: 330, cy: 155, r: 20, color: "primary", id: "p3" },
  { cx: 200, cy: 210, r: 24, color: "secondary", id: "p4" },
  { cx: 75, cy: 205, r: 18, color: "primary", id: "p5" },
];

export function HeroIllustration() {
  return (
    <motion.svg
      viewBox="0 0 400 320"
      className="w-full max-w-md"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Clip path definitions */}
      <defs>
        {people.map((p) => (
          <clipPath key={`def-${p.id}`} id={`clip-${p.id}`}>
            <circle cx={p.cx} cy={p.cy} r={p.r} />
          </clipPath>
        ))}
      </defs>

      {/* Background wave ripples */}
      <motion.path
        d="M50,200 Q100,160 150,200 T250,200 T350,200"
        fill="none"
        className="stroke-secondary"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        variants={pathVariants}
      />
      <motion.path
        d="M30,220 Q90,180 160,220 T280,220 T380,220"
        fill="none"
        className="stroke-secondary"
        strokeWidth="1"
        strokeOpacity="0.2"
        variants={pathVariants}
      />

      {/* Connection paths — wave-curved lines between people */}
      <motion.path
        d="M100,100 C140,55 190,130 230,90"
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeOpacity="0.5"
        variants={pathVariants}
      />
      <motion.path
        d="M230,90 C270,55 290,125 330,155"
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeOpacity="0.45"
        variants={pathVariants}
      />
      <motion.path
        d="M100,100 C120,160 160,185 200,210"
        fill="none"
        className="stroke-secondary"
        strokeWidth="2"
        strokeOpacity="0.45"
        variants={pathVariants}
      />
      <motion.path
        d="M200,210 C250,230 290,185 330,155"
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeOpacity="0.4"
        variants={pathVariants}
      />
      <motion.path
        d="M75,205 C95,170 140,165 200,210"
        fill="none"
        className="stroke-secondary"
        strokeWidth="1.5"
        strokeOpacity="0.4"
        variants={pathVariants}
      />
      <motion.path
        d="M75,205 C80,165 85,130 100,100"
        fill="none"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        variants={pathVariants}
      />

      {/* People avatar nodes */}
      {people.map((person) => (
        <PersonNode key={person.id} {...person} />
      ))}

      {/* Floating decorative dots */}
      <circle
        cx="160"
        cy="65"
        r="4"
        className="fill-primary animate-float"
        fillOpacity="0.4"
      />
      <circle
        cx="290"
        cy="120"
        r="3"
        className="fill-secondary animate-float-delayed"
        fillOpacity="0.4"
      />
      <circle
        cx="140"
        cy="260"
        r="3.5"
        className="fill-primary animate-float"
        fillOpacity="0.3"
      />
      <circle
        cx="310"
        cy="240"
        r="3"
        className="fill-secondary animate-float-delayed"
        fillOpacity="0.3"
      />
      <circle
        cx="55"
        cy="150"
        r="2.5"
        className="fill-primary animate-float"
        fillOpacity="0.25"
      />
      <circle
        cx="360"
        cy="95"
        r="2.5"
        className="fill-secondary animate-float-delayed"
        fillOpacity="0.25"
      />
    </motion.svg>
  );
}
