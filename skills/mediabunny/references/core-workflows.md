# Core Workflows

Use this file for practical Mediabunny implementation patterns. Verify exact signatures with the docs helper or installed TypeScript types when the project pins a different package version.

## Install And Import

- Install with `pnpm add mediabunny`, `npm install mediabunny`, or the package manager used by the repo.
- Mediabunny expects ECMAScript 2021+ and TypeScript 5.7+ for its types.
- Prefer ESM imports for tree shaking.
- Use browser-native `Blob`, `File`, `ReadableStream`, `WritableStream`, `OffscreenCanvas`, WebCodecs, and Web Audio APIs when available.
- Server-side sources and targets exist for file paths, but codec support still depends on the runtime and registered custom coders.

## Read Metadata

Use `Input` with a source and a list of formats. Constructing an `Input` is cheap; actual reads happen lazily when data is requested.

```ts
import { ALL_FORMATS, BlobSource, Input } from 'mediabunny';

const input = new Input({
  source: new BlobSource(file),
  formats: ALL_FORMATS,
});

const durationSeconds = await input.computeDuration();
const mimeType = await input.getMimeType();
const metadataTags = await input.getMetadataTags();

const videoTrack = await input.getPrimaryVideoTrack();
if (videoTrack) {
  const displayWidth = await videoTrack.getDisplayWidth();
  const displayHeight = await videoTrack.getDisplayHeight();
  const rotation = await videoTrack.getRotation();
  const packetStats = await videoTrack.computePacketStats(100);
}

const audioTrack = await input.getPrimaryAudioTrack();
if (audioTrack) {
  const sampleRate = await audioTrack.getSampleRate();
  const numberOfChannels = await audioTrack.getNumberOfChannels();
}
```

Prefer specific format singletons for bundle size:

```ts
import { Input, MP3, WAVE } from 'mediabunny';

const input = new Input({
  source,
  formats: [MP3, WAVE],
});
```

## Read Video Frames

Use `VideoSampleSink` when raw decoded frames are needed. Samples should be closed after use.

```ts
import { VideoSampleSink } from 'mediabunny';

const videoTrack = await input.getPrimaryVideoTrack();
if (!videoTrack || !(await videoTrack.canDecode())) {
  return;
}

const sink = new VideoSampleSink(videoTrack);
for await (const sample of sink.samples(0, 10)) {
  try {
    sample.draw(canvasContext, 0, 0);
  } finally {
    sample.close();
  }
}
```

Use `CanvasSink` for thumbnails, resizing, rotation, crop, or canvas output. Set `poolSize` for long loops that only need one or a few canvases at a time.

```ts
import { CanvasSink } from 'mediabunny';

const sink = new CanvasSink(videoTrack, {
  width: 320,
  height: 180,
  fit: 'cover',
  poolSize: 1,
});

const firstTimestamp = await videoTrack.getFirstTimestamp();
const duration = await videoTrack.computeDuration();
const timestamps = [0.15, 0.35, 0.55, 0.75].map((ratio) => (
  firstTimestamp + ratio * duration
));

for await (const result of sink.canvasesAtTimestamps(timestamps)) {
  if (!result) {
    continue;
  }

  const { canvas, timestamp } = result;
}
```

## Read Audio

Use `AudioSampleSink` for raw sample analysis or transformations. Use `AudioBufferSink` when integrating with Web Audio.

```ts
import { AudioSampleSink } from 'mediabunny';

const audioTrack = await input.getPrimaryAudioTrack();
if (!audioTrack || !(await audioTrack.canDecode())) {
  return;
}

const sink = new AudioSampleSink(audioTrack);
let sumOfSquares = 0;
let sampleCount = 0;

for await (const sample of sink.samples()) {
  try {
    const byteLength = sample.allocationSize({ format: 'f32', planeIndex: 0 });
    const values = new Float32Array(byteLength / 4);
    sample.copyTo(values, { format: 'f32', planeIndex: 0 });

    for (const value of values) {
      sumOfSquares += value * value;
    }

    sampleCount += values.length;
  } finally {
    sample.close();
  }
}

const rms = Math.sqrt(sumOfSquares / sampleCount);
```

## Read Encoded Packets

Use `EncodedPacketSink` for demuxing, timestamp analysis, or manual WebCodecs decoding.

```ts
import { EncodedPacketSink } from 'mediabunny';

const sink = new EncodedPacketSink(videoTrack);
const firstKeyPacket = await sink.getFirstKeyPacket({ verifyKeyPackets: true });

for await (const packet of sink.packets(firstKeyPacket)) {
  // Packets are yielded in decode order.
  const chunk = packet.toEncodedVideoChunk();
}
```

Use `metadataOnly: true` when packet bytes are not needed. Do not combine it with `verifyKeyPackets`.

## Convert Media

Use `Conversion` for most file-to-file work. The output must be fresh: no tracks, no metadata, not started.

```ts
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_MEDIUM,
} from 'mediabunny';

const input = new Input({
  source: new BlobSource(file),
  formats: ALL_FORMATS,
});

const output = new Output({
  format: new Mp4OutputFormat(),
  target: new BufferTarget(),
});

const conversion = await Conversion.init({
  input,
  output,
  tracks: 'primary',
  trim: { start: 0, end: 60 },
  video: {
    width: 1280,
    height: 720,
    fit: 'contain',
    bitrate: QUALITY_MEDIUM,
  },
  audio: {
    numberOfChannels: 1,
    sampleRate: 48000,
    bitrate: QUALITY_MEDIUM,
  },
});

if (!conversion.isValid) {
  throw new Error(`Cannot convert media: ${conversion.discardedTracks.map((item) => item.reason).join(', ')}`);
}

conversion.onProgress = (progress) => {
  // Use progress for UI state; execute() resolving is the completion signal.
};

await conversion.execute();
const buffer = output.target.buffer;
```

Use a function for track-specific conversion options:

```ts
const conversion = await Conversion.init({
  input,
  output,
  video: async (videoTrack) => ({
    width: Math.min(await videoTrack.getDisplayWidth(), 1280),
  }),
  audio: async (audioTrack) => {
    const languageCode = await audioTrack.getLanguageCode();
    return languageCode === 'eng' ? { codec: 'aac' } : { discard: true };
  },
});
```

## Create A New Media File

Use `Output`, add tracks with one source per track, then start, add media, close sources, and finalize.

```ts
import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from 'mediabunny';

const output = new Output({
  format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
  target: new BufferTarget(),
});

const videoSource = new CanvasSource(canvas, {
  codec: 'avc',
  bitrate: QUALITY_HIGH,
});
output.addVideoTrack(videoSource, { frameRate: 30 });

const audioSource = new AudioBufferSource({
  codec: 'aac',
  bitrate: QUALITY_HIGH,
});
output.addAudioTrack(audioSource);

await output.start();

for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
  await videoSource.add(frameIndex / 30, 1 / 30);
}
videoSource.close();

await audioSource.add(audioBuffer);
audioSource.close();

await output.finalize();
const result = output.target.buffer;
```

## Record Live Media

Use `MediaStreamVideoTrackSource` and `MediaStreamAudioTrackSource`. These sources pipe data automatically after `output.start()`. Watch each source's `errorPromise`, and stop underlying `MediaStreamTrack`s after finalize/cancel.

```ts
import {
  BufferTarget,
  MediaStreamAudioTrackSource,
  MediaStreamVideoTrackSource,
  Output,
  QUALITY_MEDIUM,
  WebMOutputFormat,
} from 'mediabunny';

const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const output = new Output({
  format: new WebMOutputFormat(),
  target: new BufferTarget(),
});

const videoTrack = stream.getVideoTracks()[0];
const audioTrack = stream.getAudioTracks()[0];

if (videoTrack) {
  const videoSource = new MediaStreamVideoTrackSource(videoTrack, {
    codec: 'vp9',
    bitrate: QUALITY_MEDIUM,
  });
  videoSource.errorPromise.catch((error) => output.cancel());
  output.addVideoTrack(videoSource);
}

if (audioTrack) {
  const audioSource = new MediaStreamAudioTrackSource(audioTrack, {
    codec: 'opus',
    bitrate: QUALITY_MEDIUM,
  });
  audioSource.errorPromise.catch((error) => output.cancel());
  output.addAudioTrack(audioSource);
}

await output.start();
// Later...
stream.getTracks().forEach((track) => track.stop());
await output.finalize();
```

