import { useEffect, useState } from "react";
import { etParts } from "@/lib/bitunix/et";

export default function Masthead() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const et = etParts(now);
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(now);

  return (
    <header className="bg-card border-b-[3px] border-foreground">
      <div className="mx-auto max-w-7xl px-4 pt-3 pb-2">
        <div className="flex items-center justify-between dateline border-b border-foreground/30 pb-1">
          <span>Vol. I · No. 1</span>
          <span className="hidden sm:inline">{date}</span>
          <span>{et.label}</span>
        </div>
        <div className="flex items-center justify-center py-3">
          <h1 className="font-display font-black text-5xl md:text-7xl tracking-tighter leading-none">
            THE DUMP
          </h1>
        </div>
        <div className="flex items-center justify-between dateline border-t border-foreground/30 pt-1">
          <span>Short-Only Desk</span>
          <span className="text-accent font-bold">BITUNIX USDT-M</span>
          <span>Not Financial Advice</span>
        </div>
      </div>
    </header>
  );
}