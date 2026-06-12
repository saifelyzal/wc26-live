import { getTranslations } from "next-intl/server";
import type { MatchRecap as MatchRecapData } from "@/lib/recap-store";

function youtubeVideoIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1) || null;
    if (parsed.hostname.endsWith("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;
      const [, videoId] = parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/) ?? [];
      return videoId ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function MatchRecap({ recap }: { recap: MatchRecapData | null }) {
  const t = await getTranslations("recap");
  const highlightUrl =
    recap?.official_highlight_url ??
    (recap?.youtube_video_id
      ? `https://www.youtube.com/watch?v=${recap.youtube_video_id}`
      : null);
  const highlightVideoId = highlightUrl ? youtubeVideoIdFromUrl(highlightUrl) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-white/55">{t("subtitle")}</p>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white/5 backdrop-blur-sm">
        {highlightVideoId && highlightUrl ? (
          <div>
            <iframe
              className="aspect-video w-full bg-pitch-950"
              src={`https://www.youtube-nocookie.com/embed/${highlightVideoId}`}
              title={t("officialHighlights")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
            <a
              href={highlightUrl}
              className="block border-t border-white/10 px-5 py-3 text-center text-sm font-bold text-sol-300 hover:text-sol-400"
              rel="noreferrer"
              target="_blank"
            >
              {t("watchOfficialHighlights")}
            </a>
          </div>
        ) : highlightUrl ? (
          <a
            href={highlightUrl}
            className="group relative block aspect-video overflow-hidden bg-pitch-950"
            rel="noreferrer"
            target="_blank"
          >
            {highlightVideoId ? (
              <span
                aria-hidden="true"
                className="block h-full w-full bg-pitch-800 opacity-80 transition duration-200 group-hover:scale-105 group-hover:opacity-95"
                style={{
                  backgroundImage: `url(https://i.ytimg.com/vi/${highlightVideoId}/hqdefault.jpg)`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              />
            ) : (
              <span className="block h-full w-full bg-pitch-950" />
            )}
            <span className="absolute inset-0 bg-pitch-950/35" />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-sol-300 text-pitch-950 shadow-lg shadow-pitch-950/30 transition group-hover:bg-sol-200"
              >
                <span className="ms-1 h-0 w-0 border-y-[10px] border-s-[16px] border-y-transparent border-s-current" />
              </span>
              <span className="font-display text-xl uppercase tracking-wide text-white">
                {t("watchOfficialHighlights")}
              </span>
            </span>
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
