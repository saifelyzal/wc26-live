"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
  ar: "ع",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");

  return (
    <div
      className="ms-auto flex items-center gap-0.5 rounded-full bg-white/10 p-0.5"
      role="group"
      aria-label={t("language")}
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          aria-pressed={l === locale}
          className={`min-w-9 rounded-full px-2 py-1 text-xs font-bold transition-colors ${
            l === locale
              ? "bg-white text-pitch-900"
              : "text-white/70 hover:text-white"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
