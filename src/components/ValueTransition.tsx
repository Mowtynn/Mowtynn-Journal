import React from "react";
import { motion, AnimatePresence } from "motion/react";

export const ValueTransition = React.memo(({
  children,
  modeKey,
}: {
  children: React.ReactNode;
  modeKey: string | boolean;
}) => (
  <AnimatePresence mode="wait" initial={false}>
    <motion.span
      key={String(modeKey)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="inline-block"
      style={{ backfaceVisibility: "hidden", transform: "translate3d(0,0,0)" }}
    >
      {children}
    </motion.span>
  </AnimatePresence>
));

ValueTransition.displayName = 'ValueTransition';
