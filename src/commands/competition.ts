import type { Command } from "commander";
import { CliError } from "../lib/errors.ts";
import { printJsonWithOptionalQuery } from "../lib/json-output.ts";
import {
  loadManagedCompetitions,
  loadMineCompetitions,
  type CompetitionEnrichment,
  type CompetitionMineSection,
} from "../lib/wca/competition-data.ts";
import { createOauthClient } from "../lib/wca/client-factory.ts";
import { readCachedWcif, writeCachedWcif } from "../lib/wca/wcif-cache.ts";

interface CompetitionWcifOptions {
  competitionId: string;
  query?: string;
  profileName?: string;
  refresh?: boolean;
  raw?: boolean;
}

interface CompetitionListCommandOptions {
  profile?: string;
  raw?: boolean;
  refresh?: boolean;
  include?: string;
}

async function runCompetitionWcifCommand(options: CompetitionWcifOptions): Promise<void> {
  const wcif = await getCompetitionWcif(options.competitionId, options.profileName, options.refresh);
  await printJsonWithOptionalQuery(wcif, {
    query: options.query,
    raw: options.raw,
    emptyQueryMessage:
      "WCIF output is large. Provide a JSONata query or pass `--raw` to print the full document.",
  });
}

async function getCompetitionWcif(
  competitionId: string,
  profileName?: string,
  refresh = false,
): Promise<unknown> {
  if (!refresh) {
    const cached = await readCachedWcif(competitionId);

    if (cached !== null) {
      return cached;
    }
  }

  const client = await createOauthClient(profileName);
  const wcif = await client.competitionWcif(competitionId);
  await writeCachedWcif(competitionId, wcif);
  return wcif;
}

export function registerCompetitionCommands(program: Command): void {
  const competition = program.command("competition").description("Competition-related commands");

  competition.command("mine")
    .description("List one section of /competitions/mine and query it with JSONata")
    .argument("[query]", "JSONata query")
    .option("--profile <name>", "Profile name")
    .option("--section <section>", "Mine section: future, past, bookmarked", "future")
    .option("--include <values>", "Comma-separated included data: registration-counts,wcif")
    .option("--refresh", "Bypass the WCIF cache when using included data")
    .option("--raw", "Print the full result without applying a JSONata query")
    .action(async (query: string | undefined, options: CompetitionListCommandOptions & { section: string }) => {
      const client = await createOauthClient(options.profile);
      const section = parseMineSection(options.section);
      const included = parseIncludedData(options.include);
      const data = await loadMineCompetitions(client, section, {
        refresh: options.refresh,
        enrichments: included,
      });

      await printJsonWithOptionalQuery(data, {
        query,
        raw: options.raw,
        emptyQueryMessage:
          "Competition output can be large. Provide a JSONata query or pass `--raw` to print the full result.",
        meta: {
          profile: options.profile,
          section,
          refresh: options.refresh ?? false,
          included,
        },
      });
    });

  competition.command("managed")
    .description("List /competitions?managed_by_me=true and query it with JSONata")
    .argument("[query]", "JSONata query")
    .option("--profile <name>", "Profile name")
    .option("--search <text>", "Optional upstream competition search filter")
    .option("--include <values>", "Comma-separated included data: registration-counts,wcif")
    .option("--refresh", "Bypass the WCIF cache when using included data")
    .option("--raw", "Print the full result without applying a JSONata query")
    .action(async (query: string | undefined, options: CompetitionListCommandOptions & { search?: string }) => {
      const client = await createOauthClient(options.profile);
      const included = parseIncludedData(options.include);
      const data = await loadManagedCompetitions(client, options.search, {
        refresh: options.refresh,
        enrichments: included,
      });

      await printJsonWithOptionalQuery(data, {
        query,
        raw: options.raw,
        emptyQueryMessage:
          "Competition output can be large. Provide a JSONata query or pass `--raw` to print the full result.",
        meta: {
          profile: options.profile,
          search: options.search,
          refresh: options.refresh ?? false,
          included,
        },
      });
    });

  competition.command("wcif")
    .description("Fetch WCIF, cache it for 5 minutes, and query it with JSONata by default")
    .argument("<competitionId>", "Competition id")
    .argument("[query]", "JSONata query")
    .option("--profile <name>", "Profile name")
    .option("--refresh", "Bypass the WCIF cache")
    .option("--raw", "Print the full WCIF document")
    .action(
      async (
        competitionId: string,
        query: string | undefined,
        options: { profile?: string; refresh?: boolean; raw?: boolean },
      ) => {
        await runCompetitionWcifCommand({
          competitionId,
          query,
          profileName: options.profile,
          refresh: options.refresh,
          raw: options.raw,
        });
      },
    );
}

function parseIncludedData(value?: string): CompetitionEnrichment[] {
  if (!value) {
    return [];
  }

  const included = value.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const allowed = new Set<CompetitionEnrichment>(["registration-counts", "wcif"]);

  for (const entry of included) {
    if (!allowed.has(entry as CompetitionEnrichment)) {
      throw new CliError(
        `Unknown competition include value "${entry}". Allowed values: registration-counts,wcif.`,
      );
    }
  }

  return included as CompetitionEnrichment[];
}

function parseMineSection(value: string): CompetitionMineSection {
  if (value === "future" || value === "past" || value === "bookmarked") {
    return value;
  }

  throw new CliError(
    `Unknown competition section "${value}". Allowed values: future,past,bookmarked.`,
  );
}
