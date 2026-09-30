import { motion } from "framer-motion";

export function Particles() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,243,155,0.09),transparent_26%),radial-gradient(circle_at_78%_12%,rgba(56,189,248,0.1),transparent_24%)]" />
      {Array.from({ length: 42 }, (_, index) => (
        <motion.span
          key={index}
          className="absolute h-1 w-1 rounded-full bg-cyber/60"
          style={{ left: `${(index * 37) % 100}%`, top: `${(index * 19) % 100}%` }}
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.85, 0.15] }}
          transition={{ duration: 4 + (index % 6), repeat: Infinity, delay: index * 0.11 }}
        />
      ))}
      <div className="absolute inset-0 matrix-lines opacity-25" />
    </div>
  );
}
