# Gotchas

Read this before finalizing Mediabunny code or reviewing bugs.

## Version And Docs

- Mediabunny is new and changes quickly. Check installed types or run the docs helper when exact signatures matter.
- The public docs expose `llms-full.txt` and `mediabunny.d.ts`; use them rather than relying on memory.
- NPM package version and docs version may differ from a project's lockfile. Respect the local lockfile and installed package first.

## Async And Resource Cleanup

- Most reads are lazy and async. Methods prefixed `compute` can scan more data than `get` methods.
- Close `VideoSample` and `AudioSample` instances once done.
- Close media sources when done, especially in multi-track outputs.
- Dispose `Input` when canceling work or when reads are scoped.
- Await `.add(...)` calls for sources; skipping awaits can break backpressure and inflate memory usage.
- Watch `errorPromise` on MediaStream sources because errors happen outside the normal call flow.

## Timing

- Timestamps and durations are in seconds.
- Media files and tracks may not start at timestamp 0. Check `getFirstTimestamp`.
- Tracks can have negative starting timestamps. Avoid presenting negative samples unless the workflow explicitly needs them.
- `computeDuration` is the maximum track end timestamp, not necessarily a metadata field.
- Progress value `1` from `Conversion.onProgress` is not completion; `execute()` resolving is completion.
- For fractional frame rates, prefer exact rational values such as `30000 / 1001`.

## Conversion

- `Conversion.init` requires a fresh `Output`: no tracks, no metadata tags, pending state.
- If `conversion.isValid` is false, `execute()` will throw. Inspect `discardedTracks`.
- Discarded tracks can be acceptable if intentional, but show the user or caller when a visible/audio track is dropped unexpectedly.
- HLS conversion defaults to primary tracks; ordinary inputs default to all tracks unless configured otherwise.
- Setting codec, bitrate, key frame interval, resize, crop, process, resample, or remix options can force transcoding.
- Transmuxing is fastest when input codecs are compatible with the output container.

## Containers And Streaming

- `BufferTarget` keeps the whole output in memory. Avoid for large files.
- `StreamTarget` is not necessarily append-only. Use byte positions when assembling output.
- `AppendOnlyStreamTarget` requires an append-only format configuration.
- MP4 `fastStart: 'in-memory'` can use significant memory.
- MP4 `fastStart: 'reserve'` needs `maximumPacketCount` metadata on tracks.
- Fragmented MP4 is streaming-friendly but not equivalent to a regular MP4 for every player.
- HLS output needs `PathedTarget`; it writes multiple files.
- HLS target duration is constrained by key frame interval. Encode key frames at least every target duration.

## Codecs And WebCodecs

- Supported by Mediabunny does not mean supported by the current browser/runtime.
- Check `track.canDecode()` before using decoded sinks.
- Check `canEncode*` or `getFirstEncodable*` before selecting output codecs.
- Browser AAC, MP3, FLAC, AC-3, and E-AC-3 support can be missing. Use official extension packages.
- PCM codecs are built in and are the safest audio fallback when a container supports them.
- For transparent video, use a compatible container/codec combination such as WebM with VP9 and preserve alpha.

## Encoded Packets

- `EncodedPacketSink.packets()` yields decode order.
- `VideoSampleSink` and `CanvasSink` operate in presentation order.
- For manual packet sources, add video packets in decode order.
- B-frames can have presentation timestamps out of decode order; do not sort packet-source input purely by timestamp.
- Use `verifyKeyPackets` for robust seeking/decoding when input container metadata might mislabel key frames.
- Do not combine `verifyKeyPackets` with `metadataOnly`.

## Browser UX

- Heavy conversions should run in a worker when UI responsiveness matters.
- WebCodecs support and hardware acceleration vary by browser and codec profile.
- For user-selected files, prefer `BlobSource`; for remote files, prefer `UrlSource` if range requests are useful.
- When generating downloads from `BufferTarget`, create a `Blob` with the output MIME type.

