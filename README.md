# wca-cli

Strong base for a Bun-powered CLI that authenticates against the World Cube Association API, stores multiple local profiles, and exposes machine-friendly commands for other CLI agents.

## Install

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
bun run index.ts app list
bun run index.ts skill install
bun run index.ts profile list
bun run index.ts profile login <name>
bun run index.ts me [profile]
bun run index.ts token [profile]
```

## Setup Flow

`bun run index.ts setup` walks through:

1. Creating or selecting a saved WCA OAuth application.
2. Saving the client ID and optional client secret.
3. Creating the default profile.
4. Logging that profile in with one of these strategies:
   - `oauth-code`
   - `password`
   - `access-token`
5. Optionally installing the bundled agent skill into `~/.agents/skills/wca-cli`.

The setup command will prompt you to create an app at:

```text
https://www.worldcubeassociation.org/oauth/applications
```

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

- Commands are split into small modules under `src/cli`.
- WCA API access is isolated in `src/wca/api.ts`.
- Auth concerns are isolated in `src/auth/service.ts`.
- Persistence is isolated in `src/config`.

That keeps the base easy to extend once the broader API surface is defined.
