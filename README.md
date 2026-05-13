# Mediabunny Skill

[![skills.sh](https://skills.sh/b/kevinrss01/mediabunny-skill)](https://skills.sh/kevinrss01/mediabunny-skill)

Agent skill for implementing, debugging, and reviewing [Mediabunny](https://mediabunny.dev/) JavaScript and TypeScript media workflows.

## Install

```bash
npx skills add kevinrss01/mediabunny-skill --skill mediabunny -a codex -g
```

To install for every supported agent:

```bash
npx skills add kevinrss01/mediabunny-skill --skill mediabunny --agent '*' -g
```

## Included Skill

- `mediabunny`: Guidance for reading media metadata, extracting frames/audio/packets, creating outputs, conversion, codec checks, HLS, streaming, and custom coder workflows with Mediabunny.

## Source

The skill references Mediabunny's current public documentation and includes a helper script for fetching/searching upstream docs and type declarations when exact API shapes matter.
