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
    <header className="sticky top-0 z-10 border-b border-white/10 bg-pitch-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:gap-x-6 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-pitch-500 to-ocean-500 text-lg shadow-lg shadow-pitch-950/40">
            ⚽
          </span>
          <span className="font-display truncate text-lg uppercase tracking-wide text-white sm:text-xl">
            {tc("appName")}
          </span>
        </Link>

        <nav className="mobile-scrollbar order-last -mx-1 flex w-[calc(100%+0.5rem)] snap-x gap-1 overflow-x-auto px-1 pb-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:px-0 sm:pb-0">
          {NAV.map(({ href, key }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className={`snap-start whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
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
