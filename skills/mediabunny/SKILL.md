---
name: mediabunny
description: "Use when implementing, debugging, or reviewing Mediabunny JavaScript/TypeScript media workflows: reading media metadata, extracting frames/audio/encoded packets, demuxing, muxing, creating MP4/WebM/WAV/MP3/HLS outputs, converting/transmuxing/transcoding media, using WebCodecs, checking codec support, adding custom coders, or working with Mediabunny classes such as Input, Output, Conversion, Source, Target, media sinks, media sources, and output formats."
---

# Mediabunny

## Overview

Mediabunny is a zero-dependency TypeScript media toolkit for reading, writing, and converting media files in browser-first apps and JavaScript runtimes. Treat it as retrieval-led: the library is new and the API moves, so verify exact signatures against current docs or installed types before writing nontrivial code.

## First Moves

1. Identify the user's job: read metadata/media, create output, convert existing input, stream/HLS, inspect codecs, or custom encode/decode.
2. Check the local project first: package version, existing Mediabunny usage, framework/runtime, browser vs server constraints, and whether `mediabunny` or extension packages are installed.
3. If exact API shape matters, run the docs helper:

```bash
node /Users/kevin/.codex/skills/mediabunny/scripts/mediabunny-docs.mjs symbol ConversionOptions
node /Users/kevin/.codex/skills/mediabunny/scripts/mediabunny-docs.mjs search "AppendOnlyStreamTarget"
```

4. Prefer narrow imports over `ALL_FORMATS` when the app only supports a few containers. Use `ALL_FORMATS` for broad file pickers or prototypes.
5. Choose the highest-level API that solves the task:
   - Use `Input` plus sinks for reading metadata, frames, audio chunks, thumbnails, or encoded packets.
   - Use `Output` plus sources for generating a new media file from canvas, samples, packets, MediaStream tracks, audio buffers, or subtitles.
   - Use `Conversion` for transmuxing, transcoding, trimming, resizing, overlaying, compressing, extracting audio, or repackaging HLS.

## Reference Map

- Read `references/core-workflows.md` for practical implementation patterns and code skeletons.
- Read `references/api-map.md` when choosing between classes, methods, sources, sinks, targets, and conversion options.
- Read `references/formats-codecs.md` for container/codec support, output format choices, WebCodecs checks, and official extension packages.
- Read `references/hls-and-streaming.md` for HLS reading/writing, append-only output, StreamTarget, PathedTarget, and live stream behavior.
- Read `references/gotchas.md` before finalizing code or reviewing bugs.

## Implementation Rules

- Always await media source `.add(...)` calls unless the docs for that source explicitly say otherwise; the returned promise propagates backpressure.
- Close media sources as soon as they are done, especially in multi-track output workflows.
- Close decoded `VideoSample` and `AudioSample` objects when they are no longer needed.
- Call `await output.start()` after adding all output tracks and before adding media data; call `await output.finalize()` after all media has been added.
- Use a fresh `Output` for `Conversion.init(...)`; do not pre-add tracks or metadata to that output.
- Inspect `conversion.isValid` and `conversion.discardedTracks` before `execute()` whenever dropping tracks would be user-visible.
- Use `input.dispose()` or `using input = ...` for short-lived reads or cancellation-sensitive workflows.
- Avoid `StreamTarget` concatenation unless the output format is configured append-only. Normal `StreamTarget` chunks include byte positions and may rewrite previous ranges.
- For browser compatibility, probe encodability/decodability with `canEncode*`, `getFirstEncodable*`, `track.canDecode()`, or extension packages before promising a codec.
- For MP3/AAC/FLAC/AC-3/E-AC-3 encoding or decoding gaps, prefer official `@mediabunny/*` extensions before custom coders.

## Common Imports

```ts
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSink,
  Conversion,
  EncodedPacketSink,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSampleSink,
} from 'mediabunny';
```

Use project style when editing existing code. In this VoiceCheap repo, keep TypeScript strictly typed, prefer clear names, and do not add user-facing strings without localization.
