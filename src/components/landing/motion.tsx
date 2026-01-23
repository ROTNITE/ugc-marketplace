"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type MotionSectionProps = {
  className?: string;
  children: React.ReactNode;
  delay?: number;
};

const baseTransition = {
  duration: 0.8,
  ease: [0.2, 0.6, 0.2, 1] as const,
};

export function MotionSection({ className, children, delay = 0 }: MotionSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ ...baseTransition, delay }}
      className={cn(className)}
    >
      {children}
    </motion.section>
  );
}

export function MotionDiv({ className, children, delay = 0 }: MotionSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...baseTransition, delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
