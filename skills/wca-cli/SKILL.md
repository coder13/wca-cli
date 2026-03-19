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
bun run index.ts profile list
bun run index.ts profile show
bun run index.ts profile login <name>
bun run index.ts token [profile]
bun run index.ts me [profile]
```

## Workflow

1. If no profiles exist, run `bun run index.ts setup`.
2. Prefer `bun run index.ts token [profile]` for machine use.
3. Use `bun run index.ts me [profile]` to validate that auth is still working.
4. Keep profile names explicit when automations should not rely on the default profile.

## Notes

- Config is stored in `~/.wca-cli/config.json`.
- Secrets are stored locally on disk for CLI automation, so protect the host account appropriately.
- OAuth code flow is manual copy/paste by design in this base version.
