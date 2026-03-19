---
name: wca-cli
description: Use the local wca-cli to manage WCA auth profiles, retrieve tokens for automation, and verify access against the World Cube Association API.
---

# WCA CLI

Use this skill when a task needs authenticated access to `https://www.worldcubeassociation.org` through the local CLI in this repo.

## Commands

```bash
bun run index.ts help
bun run index.ts setup
bun run index.ts auth list
bun run index.ts auth show [profile]
bun run index.ts auth add
bun run index.ts auth use <profile>
bun run index.ts auth login [profile]
bun run index.ts auth status [profile]
bun run index.ts auth remove <profile>
bun run index.ts app
bun run index.ts token [profile]
bun run index.ts user permissions [--profile <name>]
bun run index.ts competition mine [query] [--profile <name>] [--section future|past|bookmarked] [--include registration-counts|wcif] [--raw]
bun run index.ts competition managed [query] [--profile <name>] [--search <text>] [--include registration-counts|wcif] [--raw]
bun run index.ts competition wcif <competitionId> '<jsonata-query>'
bun run index.ts search all <query> '<jsonata-query>'
bun run index.ts search competitions <query> '<jsonata-query>'
```

## Workflow

1. If no profiles exist, run `bun run index.ts setup`.
2. `setup` installs the skill, saves the single app config, and can optionally add a default user profile.
3. Prefer `bun run index.ts auth login [profile]` for browser-based OAuth authorization code login with the configured app.
4. Use `bun run index.ts auth status [profile]` to verify that auth is working by calling `/api/v0/me`.
5. Use `bun run index.ts auth add` to create a new profile and immediately trigger its login flow.
6. Use `bun run index.ts auth use <profile>` when automation should switch the default profile.
7. Prefer `bun run index.ts token [profile]` for machine use.
8. Use `bun run index.ts user permissions [--profile <name>]` when the task depends on auth capabilities.
9. Prefer `competition mine` and `competition managed` with JSONata queries over workflow-specific commands.
10. Use `--include registration-counts` when you need WCIF-derived accepted/pending/deleted counts merged into the competition list.
11. Use `--include wcif` only when you need deep ad hoc access to the full WCIF per competition.
12. Use `bun run index.ts competition wcif <competitionId> '<jsonata-query>'` for single-competition WCIF access instead of dumping the full document.
13. Keep profile names explicit when automations should not rely on the default profile.
14. Use the `search` commands for public `/api/v0/search*` discovery endpoints.

## Notes

- Config is stored in `~/.wca-cli/config.json`.
- The CLI stores one saved app configuration and multiple user profiles.
- App credentials are stored once for the CLI; access tokens and refresh tokens are stored per profile.
- WCIF responses are cached in `~/.wca-cli/cache/wcif/` for up to 5 minutes.
- Secrets are stored locally on disk for CLI automation, so protect the host account appropriately.
- The default OAuth code flow uses a local callback at `http://localhost:1339/callback`, prints the authorization URL, and exchanges the code automatically after you open the URL in your browser.
- Manual code entry is only used when the configured redirect URI is not local.
- Refresh tokens are reused when available.
- `competition wcif` and `search` support JSONata queries so agents can extract only the needed fields instead of printing large payloads.
- `competition mine` and `competition managed` also support JSONata queries and optional enrichment for generic scripting.
- Non-interactive command output is machine-readable JSON on stdout using `{ ok, data, meta? }` for success and `{ ok: false, error }` for failures.
- Human guidance and progress messages are written to stderr.
- Use WCIF `persons[].registration.status == "accepted"` for accepted-registration counts; that was reliable in live testing.
- Do not rely on `registration_status` from `/api/v0/competitions/mine` for future competitions; it returned inconsistent values such as `"past"` for some upcoming events during testing on March 18, 2026.
- Use `/api/v0/competitions?managed_by_me=true` for competitor limits, because that payload includes `competitor_limit`.
- `auth list` returns both a stable `key` and a display `name`; agents should prefer the `key` when they need an unambiguous profile identifier.
