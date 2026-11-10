# pi-cc-bridge

Use your Claude Max (or Pro) subscription with Pi.

pi-cc-bridge is an unofficial Pi package that routes Anthropic OAuth requests through your existing Claude subscription usage by applying Claude Code 2.1.319 request conventions.

## Install

| Component | Compatible version |
| --- | --- |
| Pi | 0.84.1 or newer |
| Claude Code protocol | 2.1.319 |

The Pi package requires Pi 0.84.1 or newer, with no upper version limit. Future Pi releases are trusted until an incompatibility is identified; the package peer dependencies are `"*"` because Pi supplies its core packages at runtime.

```sh
pi install git:github.com/SlothfulDreams/pi-cc-bridge
```

Pi checks unpinned Git packages for updates in the background. When a newer pi-cc-bridge commit is available, Pi displays a package-update notice; apply it with:

```sh
pi update --extensions
```

For a reproducible install, pin a release tag:

```sh
pi install git:github.com/SlothfulDreams/pi-cc-bridge@<tag>
```

Pinned packages do not move automatically. Install a newer tagged ref explicitly when you are ready to upgrade.

Then use Pi's normal Anthropic login:

```text
/login anthropic
```

The package replaces only the built-in Anthropic provider implementation and only transforms OAuth-token requests. It preserves Pi's credential storage, OAuth refresh, model behavior, tools, retries, streaming, and usage accounting. API-key requests and non-Anthropic providers pass through unchanged.

## Identity discovery

No identity environment variables are required. When Claude Code state exists, pi-cc-bridge reads the installation ID and account UUID from `~/.claude.json` (or the location selected by `CLAUDE_CONFIG_DIR`) in memory and adds matching request metadata. It does not copy, print, or persist those values.

Subscription routing also works when that optional metadata is unavailable.

## What it changes

For Anthropic OAuth requests, pi-cc-bridge reproduces the version-specific SDK-CLI request shape:

- exact billing and Agent SDK system-block ordering;
- the prompt-dependent `cc_version` suffix;
- structure-aware `cch` calculation using seeded XXH64;
- per-request `x-client-request-id` values;
- Claude Code session headers;
- automatically discovered identity metadata when available.

The checksum implementation validates and updates only the first billing system block. User content, tool results, descriptions, and nested `model` or `max_tokens` fields cannot redirect the placeholder patch.

Pi's message-thread continuations remain enabled. Thread creation and full-history replays receive the normal billing checksum; valid continuations omit `system` and `tools`, inherit those fields from the server-side thread, and pass through unchanged. Pi retains responsibility for thread state and recovery when a thread expires or is unsupported.

## Verify the package

```sh
npm ci --ignore-scripts
npm run check
```

Public CI uses fake transports only. It never makes provider requests and requires no credentials.

## Status and terms

This project is unofficial and is not affiliated with or endorsed by Anthropic or the upstream Pi project. Users must provide their own valid account credentials and determine whether use complies with applicable service terms. The compatibility mechanism is version-specific and must be revalidated when Claude Code or Pi changes.

No OAuth tokens, identifiers, captures, or private Claude state are included in the package. The package is distributed under the MIT license; see [`LICENSE`](LICENSE).
