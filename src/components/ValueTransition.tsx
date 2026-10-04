import React from "react";
import { motion, AnimatePresence } from "motion/react";

export const ValueTransition = React.memo(({
  children,
  modeKey,
}: {
  children: React.ReactNode;
  modeKey: string | boolean;
}) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span
      key={String(modeKey)}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.08, ease: "easeOut" }}
      className="inline-block"
      style={{ willChange: "transform, opacity", backfaceVisibility: "hidden", transform: "translate3d(0,0,0)" }}
    >
      {children}
    </motion.span>
  </AnimatePresence>
));

ValueTransition.displayName = 'ValueTransition';
