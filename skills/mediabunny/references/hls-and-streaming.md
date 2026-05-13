# HLS And Streaming

Use this file for live media, HLS, network upload, append-only output, and multi-file targets.

## Read HLS

Use `HLS_FORMATS` with `UrlSource` for `.m3u8` playlists.

```ts
import { HLS_FORMATS, Input, UrlSource, desc } from 'mediabunny';

const input = new Input({
  source: new UrlSource('https://example.com/master.m3u8'),
  formats: HLS_FORMATS,
});

const videoTracks = await input.getVideoTracks({
  sortBy: async (track) => desc(await track.getDisplayHeight()),
});

const selectedVideoTrack = videoTracks[0] ?? null;
const selectedAudioTrack = selectedVideoTrack
  ? await selectedVideoTrack.getPrimaryPairableAudioTrack()
  : await input.getPrimaryAudioTrack();
```

HLS inputs can have many rendition tracks. Prefer track queries and pairability helpers instead of assuming one video and one audio track.

## Live HLS Reads

Live tracks wait when a read asks for data beyond the current live edge. Use `skipLiveWait: true` when polling known duration or latest packet.

```ts
const isLive = await selectedVideoTrack.isLive();
if (isLive) {
  const knownDuration = await selectedVideoTrack.getDurationFromMetadata({
    skipLiveWait: true,
  });
  const refreshInterval = await selectedVideoTrack.getLiveRefreshInterval();
}
```

For conversion of a live stream section, first read the live edge with `skipLiveWait`, then trim to a bounded window.

```ts
const liveEdge = await input.getDurationFromMetadata(undefined, {
  skipLiveWait: true,
});

const conversion = await Conversion.init({
  input,
  output,
  trim: {
    start: liveEdge ?? 0,
    end: (liveEdge ?? 0) + 60,
  },
});
```

## Stream Targets

Use `StreamTarget` when writing to a `WritableStream`, such as the File System API or custom stream handling.

```ts
import { Output, StreamTarget } from 'mediabunny';

const output = new Output({
  format,
  target: new StreamTarget(writableStream, {
    chunked: true,
    chunkSize: 2 ** 20,
  }),
});
```

Important: normal `StreamTarget` chunks contain `{ data, position }`. Write each chunk at its byte position in arrival order. Do not concatenate chunks unless the format is append-only.

## Append-Only Network Upload

Use `AppendOnlyStreamTarget` only with append-only format configurations.

```ts
import { AppendOnlyStreamTarget, Mp4OutputFormat, Output } from 'mediabunny';

const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();

const output = new Output({
  format: new Mp4OutputFormat({ fastStart: 'fragmented' }),
  target: new AppendOnlyStreamTarget(writable),
});

const uploadPromise = fetch('/upload', {
  method: 'POST',
  body: readable,
  duplex: 'half',
  headers: {
    'Content-Type': output.format.mimeType,
  },
});

await output.start();
// Add data...
await output.finalize();
await uploadPromise;
```

Append-only configurations include examples such as fragmented MP4, WebM/Matroska with append-only mode, Ogg, ADTS, MPEG-TS, MP3 with `xingHeader: false`, and FLAC with append-only mode.

## Write HLS

HLS output writes a master playlist, one or more media playlists, and segment files. Use `HlsOutputFormat` with `PathedTarget`.

```ts
import {
  CmafOutputFormat,
  FilePathTarget,
  HlsOutputFormat,
  MpegTsOutputFormat,
  Output,
  PathedTarget,
} from 'mediabunny';

const output = new Output({
  format: new HlsOutputFormat({
    segmentFormat: [
      new MpegTsOutputFormat(),
      new CmafOutputFormat(),
    ],
    targetDuration: 4,
  }),
  target: new PathedTarget('master.m3u8', ({ path }) => (
    new FilePathTarget(`/output/${path}`)
  )),
});
```

Use `OutputTrackGroup` and track metadata when defining multiple renditions or alternate audio/subtitle tracks. Keep key frames at least as frequent as `targetDuration`, otherwise segments can exceed the target duration.

## HLS Live Output

Set `live: true` in `HlsOutputFormat` to continuously emit updated playlists. Use `maxLiveSegmentCount` to control rolling playlist length.

```ts
const output = new Output({
  format: new HlsOutputFormat({
    segmentFormat: new MpegTsOutputFormat(),
    live: true,
    targetDuration: 2,
    maxLiveSegmentCount: 6,
  }),
  target,
});
```

To emit `#EXT-X-PROGRAM-DATE-TIME`, mark output track metadata as relative to Unix epoch where supported by the current type definitions.

## Multi-File Targets

Use `PathedTarget` for formats that write multiple files. The callback receives a request with:

- `path`: requested file path
- `isRoot`: whether the requested file is the root entry file
- `mimeType`: MIME type for that file

Return any target that fits the destination: `FilePathTarget`, `StreamTarget`, cloud-upload target wrappers, or `BufferTarget` for tests.

