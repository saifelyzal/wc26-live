// FIFA three-letter codes -> ISO 3166-1 alpha-2, so Intl.DisplayNames can
// localize country names in every supported locale without manual catalogs.
const TLA_TO_ISO2: Record<string, string> = {
  ALG: "DZ", ARG: "AR", AUS: "AU", AUT: "AT", BEL: "BE", BIH: "BA",
  BOL: "BO", BRA: "BR", CAN: "CA", CHI: "CL", CIV: "CI", CMR: "CM",
  COD: "CD", COL: "CO", CPV: "CV", CRC: "CR", CRO: "HR", CUW: "CW",
  CZE: "CZ", DEN: "DK", ECU: "EC", EGY: "EG",
  ESP: "ES", FRA: "FR", GER: "DE", GHA: "GH", HAI: "HT", HON: "HN",
  IRN: "IR", IRQ: "IQ", ITA: "IT", JAM: "JM", JOR: "JO", JPN: "JP",
  KOR: "KR", KSA: "SA", MAR: "MA", MEX: "MX", NED: "NL", NGA: "NG",
  NOR: "NO", NZL: "NZ", PAN: "PA", PAR: "PY", PER: "PE", POL: "PL",
  POR: "PT", QAT: "QA", RSA: "ZA", RUS: "RU", SEN: "SN", SRB: "RS",
  SUI: "CH", SWE: "SE", TUN: "TN", TUR: "TR", UAE: "AE", UKR: "UA",
  URU: "UY", URY: "UY", USA: "US", UZB: "UZ", VEN: "VE",
};

export function isoFromTla(tla: string): string | undefined {
  return TLA_TO_ISO2[tla];
}

/**
 * Localized team name. Accepts either a FIFA TLA (live data) or an ISO
 * alpha-2 code (historical data). `overrides` handles teams without an ISO
 * region (England, West Germany, ...) — pass the `teams` message namespace.
 */
export function teamName(
  locale: string,
  team: { name: string; tla?: string; iso2?: string },
  overrides?: (name: string) => string | undefined,
): string {
  const override = overrides?.(team.name);
  if (override) return override;
  const iso2 = team.iso2 ?? (team.tla ? isoFromTla(team.tla) : undefined);
  if (iso2) {
    try {
      const localized = new Intl.DisplayNames([locale], {
        type: "region",
      }).of(iso2);
      if (localized && localized !== iso2) return localized;
    } catch {
      // fall through to the API-provided name
    }
  }
  return team.name;
}

/** Emoji flag from ISO alpha-2 (used where the API provides no crest). */
export function flagEmoji(iso2: string | undefined): string {
  if (!iso2 || iso2.length !== 2) return "🏳️";
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
}
