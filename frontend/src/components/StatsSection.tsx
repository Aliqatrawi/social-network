"use client";

import { useRef, useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import {
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  animate,
} from "framer-motion";

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useMotionValueEvent(count, "change", (latest) => {
    setDisplay(Math.round(latest));
  });

  useEffect(() => {
    if (isInView) {
      animate(count, target, { duration: 2, ease: "easeOut" });
    }
  }, [isInView, count, target]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  { value: 10000, suffix: "+", label: "Active Users" },
  { value: 50000, suffix: "+", label: "Posts Shared" },
  { value: 500, suffix: "+", label: "Communities" },
];

export function StatsSection() {
  return (
    <section className="py-24 px-6 bg-content2">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          className="text-3xl font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          Join thousands riding the wave
        </motion.h2>
        <motion.p
          className="text-default-500 mb-12"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          A growing community that never stops moving.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
        >
          <Card className="glass-card shadow-xl">
          <CardBody className="p-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              >
                <div className="text-4xl sm:text-5xl font-bold text-primary">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="mt-2 text-default-500 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          </CardBody>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
