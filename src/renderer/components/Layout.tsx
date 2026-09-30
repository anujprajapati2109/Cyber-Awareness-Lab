import { motion } from "framer-motion";
import { disclaimer } from "../../shared/types";
import { Particles } from "./Particles";

type Props = {
  children: React.ReactNode;
  title?: string;
  active?: string;
  onNavigate?: (page: string) => void;
};

export function Layout({ children, title = "ReconLens", active, onNavigate }: Props) {
  return (
    <main className="min-h-screen bg-void text-slate-100">
      <Particles />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5">
        <header className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyber">Consent-first training environment</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
          </div>
          {onNavigate && (
            <nav className="flex gap-2 rounded-md border border-white/10 bg-white/[0.03] p-1">
              {["home", "create", "settings"].map((item) => (
                <button
                  key={item}
                  onClick={() => onNavigate(item)}
                  className={`rounded px-3 py-2 text-sm capitalize transition ${
                    active === item ? "bg-cyber text-black" : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          )}
        </header>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex-1">
          {children}
        </motion.div>
        <footer className="mt-5 rounded border border-cyber/20 bg-cyber/5 px-4 py-3 text-sm text-slate-300">{disclaimer}</footer>
      </div>
    </main>
  );
}
