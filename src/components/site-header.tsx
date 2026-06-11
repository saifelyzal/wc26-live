"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

const NAV = [
  { href: "/", key: "home" },
  { href: "/matches", key: "matches" },
  { href: "/groups", key: "groups" },
  { href: "/bracket", key: "bracket" },
  { href: "/stats", key: "stats" },
  { href: "/history", key: "history" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();

  return (
    <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-pitch-500 to-ocean-500 text-lg shadow-lg shadow-pitch-950/40">
            ⚽
          </span>
          <span className="font-display text-xl uppercase tracking-wide text-white">
            {tc("appName")}
          </span>
        </Link>

        <nav className="order-last flex w-full gap-1 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:flex-1 sm:pb-0">
          {NAV.map(({ href, key }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-sol-400 text-pitch-950 shadow-md shadow-sol-500/30"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <LanguageSwitcher />
      </div>
    </header>
  );
}
