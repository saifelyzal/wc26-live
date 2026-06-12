import { getTranslations } from "next-intl/server";
import type { MatchRecap as MatchRecapData } from "@/lib/recap-store";

export async function MatchRecap({ recap }: { recap: MatchRecapData | null }) {
  const t = await getTranslations("recap");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-white/55">{t("subtitle")}</p>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white/5 backdrop-blur-sm">
        {recap?.youtube_video_id ? (
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube.com/embed/${recap.youtube_video_id}`}
            title={t("officialHighlights")}
            allowFullScreen
          />
        ) : recap?.official_highlight_url ? (
          <a
            href={recap.official_highlight_url}
            className="block p-8 text-center text-sm font-bold text-sol-300 hover:text-sol-400"
            rel="noreferrer"
            target="_blank"
          >
            {t("watchOfficialHighlights")}
          </a>
        ) : (
          <p className="p-8 text-center text-sm text-white/60">
            {t("highlightsComingSoon")}
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 text-pitch-950 shadow-lg shadow-pitch-950/30">
        <h2 className="font-display mb-3 text-xl uppercase tracking-wide">
          {t("summary")}
        </h2>
        {recap?.summary ? (
          <p className="text-sm leading-7 text-pitch-950/75">{recap.summary}</p>
        ) : (
          <p className="text-sm text-pitch-950/50">{t("recapComingSoon")}</p>
        )}
      </section>

      <section className="rounded-3xl bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="font-display mb-4 text-xl uppercase tracking-wide text-sol-300">
          {t("keyMoments")}
        </h2>
        {recap?.key_moments.length ? (
          <ul className="space-y-2">
            {recap.key_moments.map((moment, index) => (
              <li
                key={`${moment.minute ?? "ft"}-${index}`}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-pitch-950"
              >
                <span className="font-display tabular me-2 text-ocean-700">
                  {moment.minute == null ? t("fullTime") : `${moment.minute}'`}
                </span>
                {moment.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-white/50">
            {t("momentsComingSoon")}
          </p>
        )}
      </section>
    </div>
  );
}
