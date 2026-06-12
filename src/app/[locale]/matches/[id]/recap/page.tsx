import { notFound } from "next/navigation";
import { MatchRecap } from "@/components/match-recap";
import { getLiveServer } from "@/lib/live-server";
import { createMatchRecapStore } from "@/lib/recap-store";

export const dynamic = "force-dynamic";

export default async function MatchRecapPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const matchId = Number(id);
  const server = getLiveServer();
  server.start();
  const matches = await server.getMatches();

  if (!matches.matches.some((m) => m.id === matchId)) notFound();

  const store = createMatchRecapStore();
  const recap = (await store.find(id, locale)) ?? (await store.find(id, "en"));

  return <MatchRecap recap={recap} />;
}
