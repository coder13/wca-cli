import type { CompetitionSummary, MyCompetitionsResponse } from "./oauth-types.ts";
import type { WcaOauthClient } from "./oauth-client.ts";
import { readCachedWcif, writeCachedWcif } from "./wcif-cache.ts";

export type CompetitionMineSection = "future" | "past" | "bookmarked";
export type CompetitionEnrichment = "registration-counts" | "wcif";

export interface CompetitionRegistrationCounts {
  accepted: number;
  pending: number;
  deleted: number;
  totalPersons: number;
}

export interface EnrichedCompetition extends CompetitionSummary {
  registrationCounts?: CompetitionRegistrationCounts;
  wcif?: Record<string, unknown>;
}

export interface CompetitionDataOptions {
  refresh?: boolean;
  enrichments?: CompetitionEnrichment[];
}

export async function loadMineCompetitions(
  client: WcaOauthClient,
  section: CompetitionMineSection,
  options: CompetitionDataOptions = {},
): Promise<EnrichedCompetition[]> {
  const competitions = await client.myCompetitions();
  const selected = selectMineSection(competitions, section);
  return enrichCompetitions(client, selected, options);
}

export async function loadManagedCompetitions(
  client: WcaOauthClient,
  searchQuery?: string,
  options: CompetitionDataOptions = {},
): Promise<EnrichedCompetition[]> {
  const competitions = await client.managedCompetitions({ q: searchQuery });
  return enrichCompetitions(client, competitions, options);
}

function selectMineSection(
  competitions: MyCompetitionsResponse,
  section: CompetitionMineSection,
): CompetitionSummary[] {
  if (section === "future") {
    return competitions.future_competitions;
  }

  if (section === "past") {
    return competitions.past_competitions;
  }

  return competitions.bookmarked_competitions;
}

async function enrichCompetitions(
  client: WcaOauthClient,
  competitions: CompetitionSummary[],
  options: CompetitionDataOptions,
): Promise<EnrichedCompetition[]> {
  const enrichments = new Set(options.enrichments ?? []);

  if (enrichments.size === 0) {
    return competitions.map((competition) => ({ ...competition }));
  }

  const results: EnrichedCompetition[] = [];

  for (const competition of competitions) {
    const enriched: EnrichedCompetition = { ...competition };

    if (enrichments.has("registration-counts") || enrichments.has("wcif")) {
      const wcif = await getCompetitionWcif(
        client,
        competition.id,
        options.refresh ?? false,
      );

      if (enrichments.has("registration-counts")) {
        enriched.registrationCounts = summarizeRegistrationCounts(wcif);
      }

      if (enrichments.has("wcif")) {
        enriched.wcif = wcif;
      }
    }

    results.push(enriched);
  }

  return results;
}

function summarizeRegistrationCounts(
  wcif: Record<string, unknown>,
): CompetitionRegistrationCounts {
  const counts: CompetitionRegistrationCounts = {
    accepted: 0,
    pending: 0,
    deleted: 0,
    totalPersons: 0,
  };

  const persons = Array.isArray(wcif.persons) ? wcif.persons : [];

  counts.totalPersons = persons.length;

  for (const person of persons) {
    const status = typeof person?.registration?.status === "string"
      ? person.registration.status
      : undefined;

    if (status === "accepted") {
      counts.accepted += 1;
    } else if (status === "pending") {
      counts.pending += 1;
    } else if (status === "deleted") {
      counts.deleted += 1;
    }
  }

  return counts;
}

async function getCompetitionWcif(
  client: WcaOauthClient,
  competitionId: string,
  refresh: boolean,
): Promise<Record<string, unknown>> {
  if (!refresh) {
    const cached = await readCachedWcif(competitionId);

    if (cached && typeof cached === "object") {
      return cached as Record<string, unknown>;
    }
  }

  const wcif = await client.competitionWcif(competitionId);
  await writeCachedWcif(competitionId, wcif);
  return wcif as Record<string, unknown>;
}
