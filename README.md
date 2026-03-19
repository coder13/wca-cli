# wca-cli

Strong base for a Bun-powered CLI that authenticates against the World Cube Association API, stores multiple local profiles, and exposes machine-friendly commands for other CLI agents.

## Install

`wca-cli` is published to npm, but it is a Bun-based CLI. Install Bun first, then install the package globally:

```bash
npm install -g wca-cli
# or
bun add -g wca-cli
```

For local development in this repo:

```bash
bun install
```

## Commands

```bash
bun run index.ts help
```

Core commands:

```bash
bun run index.ts setup
bun run index.ts app
bun run index.ts auth list
bun run index.ts auth show [profile]
bun run index.ts auth add
bun run index.ts auth use <profile>
bun run index.ts auth login [profile]
bun run index.ts auth status [profile]
bun run index.ts auth remove <profile>
bun run index.ts skill install
bun run index.ts competition wcif MyCompetition2026 'persons.name'
bun run index.ts competition mine 'registrationCounts.accepted' --section future --include registration-counts
bun run index.ts competition managed '{ "id": id, "accepted": registrationCounts.accepted, "limit": competitor_limit }' --include registration-counts
bun run index.ts search all 'Max Park' 'result.name'
bun run index.ts search competitions 'Nationals' 'result.id'
bun run index.ts user permissions
bun run index.ts me [profile]
bun run index.ts token [profile]
```

## Setup Flow

`bun run index.ts setup` walks through:

1. Optionally installing the bundled agent skill into `~/.agents/skills/wca-cli`.
2. Configuring the OAuth application used by this CLI.
3. Saving one app-level credential set:
   - app URL
   - client ID
   - client secret
   - redirect URI
   - scopes
4. Default scopes are `public email manage_competitions`.
5. Optionally adding a user profile under that app.
6. If you add a profile, choosing that user's login method:
   - `oauth-code` for browser-based OAuth authorization code flow
   - `password`
7. Storing access tokens per user account.
8. Reusing refresh tokens when available to keep that user logged in.
9. Optionally skipping user creation and adding profiles later with `wca-cli auth add`, which now creates the profile and immediately runs login.

If an app is already saved, rerunning setup reuses it by default and asks whether you want to change the saved app configuration before prompting for the app fields again.

The setup command will prompt you to create an app at:

```text
https://www.worldcubeassociation.org/oauth/applications
```

When creating the OAuth app, use:

```text
Redirect URI: http://localhost:1339/callback
Scopes: public email manage_competitions
```

With that default redirect URI, OAuth login starts a local callback server, prints the authorization URL, and waits for the returned code automatically after you open the URL in your browser. Manual code entry is only used when you configure a non-local redirect URI.

By default, the CLI stores data in:

```text
~/.wca-cli/config.json
```

The config directory is created with `0700` permissions and the config file with `0600`.

## Skill Install

This repo includes a Codex/agent skill at `skills/wca-cli/SKILL.md`.

Install it into `~/.agents/skills/wca-cli/` with:

```bash
bun run index.ts skill install
# or
bun run install-skill
```

## Design Notes

- Commands live under `src/commands`.
- Reusable code lives under `src/lib`, with each file focused on a single concern.
- WCA API access is isolated in `src/lib/wca/api.ts`.
- The read-only OAuth endpoint reference in `oauth_api_endpoints.md` is modeled in `src/lib/wca/oauth-types.ts` and `src/lib/wca/oauth-client.ts`.
- Interactive setup/prompts use `@clack/prompts` with colored output.
- Auth concerns are isolated in `src/lib/auth/service.ts`.
- Persistence is isolated in `src/lib/config`.
- Non-interactive command results are emitted as JSON envelopes on stdout with the shape `{ ok, data, meta? }`.
- Errors are emitted as JSON envelopes on stdout with the shape `{ ok: false, error: { code, message } }`.
- Human guidance and progress messages are written to stderr so agents can parse stdout safely.

## WCIF Querying

`competition wcif` caches the fetched WCIF for up to 5 minutes under `~/.wca-cli/cache/wcif/`.

By default, the command expects a JSONata query so the CLI does not dump the full WCIF accidentally:

```bash
bun run index.ts competition wcif MyCompetition2026 'schedule.venues.rooms.activities.name'
```

Use `--refresh` to bypass the cache and `--raw` only when you explicitly want the whole document.

## Competition Data

`competition mine` and `competition managed` are the generic list commands for competition data.

- Both support a positional JSONata query.
- Both support `--raw` to print the full result.
- Both support `--include registration-counts` to add WCIF-derived `registrationCounts`.
- Both support `--include wcif` to embed the full WCIF under `wcif` when you need deeper ad hoc queries.
- `competition mine` supports `--section future|past|bookmarked`.
- `competition managed` supports `--search <text>` for the upstream API filter.

Examples:

```bash
bun run index.ts competition managed \
  '{ "id": id, "accepted": registrationCounts.accepted, "limit": competitor_limit }' \
  --include registration-counts

bun run index.ts competition mine \
  '$[registrationCounts.accepted > 0].{ "id": id, "accepted": registrationCounts.accepted }' \
  --section future \
  --include registration-counts
```

## OAuth Endpoint Commands

The CLI now exposes commands for the non-registration endpoints from `oauth_api_endpoints.md`, including:

- `me`
- `user permissions`
- `competition mine`
- `competition managed`
- `competition wcif`

The registration-specific endpoints and live-data endpoints from that reference are intentionally not exposed yet in the CLI command layer.

## Search Commands

The CLI also exposes the public v0 search endpoints:

- `search all`
- `search posts`
- `search competitions`
- `search users`
- `search persons`
- `search regulations`
- `search incidents`

That keeps the base easy to extend once the broader API surface is defined.
