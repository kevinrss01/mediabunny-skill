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
3. Decide whether a bundled reference is enough or whether exact upstream API retrieval is needed. Use bundled references for workflow shape; use upstream docs or installed types for signatures, options, and edge cases.
4. If exact API shape matters, resolve this skill's folder (the directory containing this `SKILL.md`) and run the docs helper from that folder:

```bash
node scripts/mediabunny-docs.mjs symbol ConversionOptions
node scripts/mediabunny-docs.mjs search "AppendOnlyStreamTarget"
```

5. Prefer narrow imports over `ALL_FORMATS` when the app only supports a few containers. Use `ALL_FORMATS` for broad file pickers or prototypes.
6. Choose the highest-level API that solves the task:
   - Use `Input` plus sinks for reading metadata, frames, audio chunks, thumbnails, or encoded packets.
   - Use `Output` plus sources for generating a new media file from canvas, samples, packets, MediaStream tracks, audio buffers, or subtitles.
   - Use `Conversion` for transmuxing, transcoding, trimming, resizing, overlaying, compressing, extracting audio, or repackaging HLS.

## Official Documentation

Prefer these upstream docs when the task needs current API behavior:

- [Quick start](https://mediabunny.dev/guide/quick-start) - short examples for metadata, thumbnails, packets, outputs, live recording, conversion, extraction, compression, and overlays.
- [Reading media files](https://mediabunny.dev/guide/reading-media-files) - `Input`, input sources, metadata, track queries, lazy reads, disposal, and timing.
- [Media sinks](https://mediabunny.dev/guide/media-sinks) - `EncodedPacketSink`, `VideoSampleSink`, `CanvasSink`, `AudioSampleSink`, `AudioBufferSink`, async iterators, packet order, and live waits.
- [Writing media files](https://mediabunny.dev/guide/writing-media-files) - `Output`, targets, track metadata, lifecycle, finalization, cancellation, packet buffering, and MIME type.
- [Media sources](https://mediabunny.dev/guide/media-sources) - `CanvasSource`, sample sources, packet sources, `MediaStream` sources, subtitle sources, encoding configs, and backpressure.
- [Output formats](https://mediabunny.dev/guide/output-formats) - MP4/MOV/CMAF/WebM/MKV/Ogg/MP3/WAV/ADTS/FLAC/MPEG-TS/HLS choices, options, append-only modes, and callbacks.
- [Converting media files](https://mediabunny.dev/guide/converting-media-files) - `Conversion`, transmuxing, transcoding, trimming, resizing, rotation, crop, compression, progress, track fan-out, and discarded tracks.
- [Supported formats & codecs](https://mediabunny.dev/guide/supported-formats-and-codecs) - container/codec matrix, encodability/decodability helpers, official extensions, and custom coders.
- [Packets & samples](https://mediabunny.dev/guide/packets-and-samples) - `EncodedPacket`, `VideoSample`, `AudioSample`, copying, drawing, conversion to WebCodecs/Web Audio objects, and cleanup.
- [Reading HLS](https://mediabunny.dev/guide/reading-hls) and [Writing HLS](https://mediabunny.dev/guide/writing-hls) - HLS track selection, pairability, live edge handling, `PathedTarget`, segment formats, and live playlist output.
- [API reference](https://mediabunny.dev/api/) - symbol-level API docs.
- [LLM docs](https://mediabunny.dev/llms), [llms-full.txt](https://mediabunny.dev/llms-full.txt), and [type declarations](https://mediabunny.dev/mediabunny.d.ts) - best sources for retrieval-led implementation.
- [Codec Registry](https://mediabunny.dev/codec-registry/overview) - exact packet formats, codec strings, and decoder config rules.

## Reference Map

- Read `references/core-workflows.md` for practical implementation patterns and code skeletons.
- Read `references/api-map.md` when choosing between classes, methods, sources, sinks, targets, and conversion options.
- Read `references/formats-codecs.md` for container/codec support, output format choices, WebCodecs checks, and official extension packages.
- Read `references/hls-and-streaming.md` for HLS reading/writing, append-only output, StreamTarget, PathedTarget, and live stream behavior.
- Read `references/gotchas.md` before finalizing code or reviewing bugs.

## Task Router

- Metadata, duration, dimensions, rotation, tags, track language, bitrate, or FPS: start with `Input`, then `getPrimaryVideoTrack`, `getPrimaryAudioTrack`, and track metadata methods. Use `compute*` methods only when metadata methods are insufficient.
- Thumbnails, waveform-style analysis, preview frames, or custom media inspection: use `CanvasSink`, `VideoSampleSink`, `AudioSampleSink`, or `AudioBufferSink` after checking `track.canDecode()`.
- Demuxing, packet timestamps, keyframe extraction, manual decoding, or transmuxing without decoding: use `EncodedPacketSink`; remember packets are handled in decode order when iterating.
- File-to-file work such as MP4 to WebM, audio extraction, compression, trim, resize, crop, rotate, overlay, or HLS repackaging: use `Conversion` unless the user needs fine-grained muxing control.
- Procedural generation, canvas capture, screen/webcam recording, subtitles, or writing already-encoded packets: use `Output` plus the matching media source.
- Network upload, Media Source Extensions, or large outputs: avoid `BufferTarget`; use `StreamTarget` or `AppendOnlyStreamTarget` only with an append-only output format.
- HLS VOD/live reading or writing: read `references/hls-and-streaming.md` and the official HLS docs before implementing. HLS is track-pairability-heavy and path/segment choices matter.
- Codec choice or browser compatibility: intersect output format support with `getFirstEncodable*`, `canEncode*`, and `track.canDecode()`; add official extension packages when native WebCodecs support is missing.

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
- Keep generated examples environment-aware: browser code can use `BlobSource`, `BufferTarget`, `StreamTarget`, WebCodecs, Web Audio, `OffscreenCanvas`, and `MediaStream`; server-side code should verify file-path sources/targets and coder availability.
- Use installed package types as source of truth when they disagree with current website docs, because the project lockfile controls the runtime API.

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
