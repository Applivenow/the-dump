import { Outlet, NavLink } from "react-router-dom";
import Masthead from "./Masthead";
import { cn } from "@/lib/utils";

export default function Layout() {
  const navClass = ({ isActive }) =>
    cn(
      "px-6 py-2.5 font-display font-bold uppercase tracking-widest text-sm border-r border-foreground transition-colors",
      isActive ? "bg-foreground text-background" : "text-foreground hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <div className="min-h-screen">
      <Masthead />
      <nav className="border-y-2 border-foreground bg-card">
        <div className="mx-auto max-w-7xl flex">
          <NavLink to="/" end className={navClass}>Desk</NavLink>
          <NavLink to="/auto" className={navClass}>Auto</NavLink>
          <NavLink to="/playbook" className={navClass}>Playbook</NavLink>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t-2 border-foreground py-4 mt-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="dateline">
            THE DUMP · SHORT-ONLY BITUNIX USDT-M DESK · NOT FINANCIAL ADVICE · KEYS NEVER LEAVE YOUR BROWSER
          </p>
        </div>
      </footer>
    </div>
  );
}