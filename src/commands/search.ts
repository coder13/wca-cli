import type { Command } from "commander";
import { printJsonWithOptionalQuery } from "../lib/json-output.ts";
import { createPublicClient } from "../lib/wca/client-factory.ts";
import type { SearchScope } from "../lib/wca/api.ts";

interface SearchCommandOptions {
  raw?: boolean;
}

function registerScopedSearchCommand(
  program: Command,
  name: string,
  scope: SearchScope,
  description: string,
): void {
  program.command(name)
    .description(description)
    .argument("<query>", "Search query")
    .argument("[jsonataQuery]", "Optional JSONata query")
    .option("--raw", "Print the full response")
    .action(async (query: string, jsonataQuery: string | undefined, options: SearchCommandOptions) => {
      const client = createPublicClient();
      const result = await client.search(query, scope);
      await printJsonWithOptionalQuery(result, {
        query: jsonataQuery,
        raw: options.raw,
        emptyQueryMessage:
          "Search output can be large. Provide a JSONata query or pass `--raw` to print the full response.",
      });
    });
}

export function registerSearchCommands(program: Command): void {
  const search = program.command("search").description("Search public WCA API resources");

  registerScopedSearchCommand(search, "all", "all", "Search across competitions, users, regulations, and incidents");
  registerScopedSearchCommand(search, "posts", "posts", "Search posts");
  registerScopedSearchCommand(search, "competitions", "competitions", "Search competitions");
  registerScopedSearchCommand(search, "users", "users", "Search users");
  registerScopedSearchCommand(search, "persons", "persons", "Search persons");
  registerScopedSearchCommand(search, "regulations", "regulations", "Search regulations");
  registerScopedSearchCommand(search, "incidents", "incidents", "Search incidents");
}
