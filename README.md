# Mediabunny Skill

[![skills.sh](https://skills.sh/b/kevinrss01/mediabunny-skill)](https://skills.sh/kevinrss01/mediabunny-skill)

Agent skill for building with [Mediabunny](https://mediabunny.dev/), the TypeScript media toolkit for reading, writing, and converting media in browser-first JavaScript apps.

It gives coding agents retrieval-led guidance for Mediabunny workflows: media metadata, frame/audio/packet extraction, muxing, conversion, HLS, streaming, codec support, and custom WebCodecs-style coders.

## Install

Install the skill with the [`skills`](https://www.skills.sh/docs/cli) CLI:

```bash
npx skills add kevinrss01/mediabunny-skill --skill mediabunny
```

The CLI can detect supported agents and guide the install. For a direct install, pick the agent you use:

| Agent | Command |
| --- | --- |
| Codex | `npx skills add kevinrss01/mediabunny-skill --skill mediabunny --agent codex --global` |
| Claude Code | `npx skills add kevinrss01/mediabunny-skill --skill mediabunny --agent claude-code --global` |
| Cursor | `npx skills add kevinrss01/mediabunny-skill --skill mediabunny --agent cursor --global` |
| Every supported agent | `npx skills add kevinrss01/mediabunny-skill --skill mediabunny --agent '*' --global` |

> [!TIP]
> Omit `--global` to install into the current project instead of your user-level agent configuration.

## What It Helps With

- Read media metadata, duration, dimensions, rotation, track info, and tags.
- Extract decoded video frames, canvas thumbnails, audio samples, audio buffers, or encoded packets.
- Create MP4, WebM, WAV, MP3, FLAC, MPEG-TS, and HLS outputs with the right sources and targets.
- Convert, transmux, transcode, trim, compress, resize, crop, rotate, or overlay media.
- Check browser/runtime codec support and choose official Mediabunny encoder extensions when needed.
- Avoid common mistakes around backpressure, sample cleanup, packet order, append-only streaming, and HLS target paths.

## Repository Layout

```text
skills/mediabunny/
|-- SKILL.md
|-- agents/openai.yaml
|-- references/
|   |-- api-map.md
|   |-- core-workflows.md
|   |-- formats-codecs.md
|   |-- gotchas.md
|   `-- hls-and-streaming.md
`-- scripts/
    `-- mediabunny-docs.mjs
```

## Docs Helper

The skill includes a small helper for searching the current upstream Mediabunny docs and TypeScript declarations:

```bash
node skills/mediabunny/scripts/mediabunny-docs.mjs search "ConversionOptions"
node skills/mediabunny/scripts/mediabunny-docs.mjs symbol Output
```

This keeps the skill compact while still letting agents verify exact APIs when Mediabunny changes.

## Skills.sh Listing

Skills appear on [skills.sh](https://www.skills.sh/) automatically after installs through the `skills` CLI. The expected registry ID is:

```text
kevinrss01/mediabunny-skill/mediabunny
```

After indexing, the skill page should be available at:

[skills.sh/kevinrss01/mediabunny-skill/mediabunny](https://www.skills.sh/kevinrss01/mediabunny-skill/mediabunny)

> [!NOTE]
> skills.sh search and audit data can lag behind the first install. Its public API also exposes skill details and audit results under `/api/v1/skills/{source}/{skill}` once the skill has been indexed.
