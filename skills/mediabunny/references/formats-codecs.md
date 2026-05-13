# Formats And Codecs

Use this file when choosing containers, codecs, output formats, extension packages, and compatibility checks.

## Supported Containers

Mediabunny supports these common containers for reading and writing:

- ISOBMFF/MP4 family: `.mp4`, `.m4v`, `.m4a`
- QuickTime: `.mov`
- CMAF/segmented MP4: `.m4s`
- Matroska: `.mkv`
- WebM: `.webm`
- Ogg: `.ogg`
- MP3: `.mp3`
- WAVE: `.wav`
- ADTS AAC: `.aac`
- FLAC: `.flac`
- MPEG Transport Stream: `.ts`
- HLS playlists: `.m3u8`

Use `ALL_FORMATS` for broad support. Use specific format singletons for tree shaking.

## Codec Families

Video codecs:

- `avc`: H.264
- `hevc`: H.265
- `vp8`
- `vp9`
- `av1`

Audio codecs:

- `aac`
- `opus`
- `mp3`
- `vorbis`
- `flac`
- `ac3`
- `eac3`
- PCM: `pcm-u8`, `pcm-s8`, `pcm-s16`, `pcm-s16be`, `pcm-s24`, `pcm-s24be`, `pcm-s32`, `pcm-s32be`, `pcm-f32`, `pcm-f32be`, `pcm-f64`, `pcm-f64be`, `ulaw`, `alaw`

Subtitle codecs:

- `webvtt` for writing subtitles. Current docs describe subtitle reading as unsupported.

## Compatibility Heuristics

- MP4/MOV/MKV are the broadest normal containers.
- WebM is best for VP8/VP9/AV1 plus Opus/Vorbis and transparency workflows.
- WAV is best for uncompressed PCM audio extraction.
- MP3 output requires MP3 audio and may need `@mediabunny/mp3-encoder`.
- ADTS output is AAC-only.
- FLAC output is FLAC-only and may need `@mediabunny/flac-encoder`.
- MPEG-TS commonly carries AVC/HEVC plus AAC/MP3/AC-3/E-AC-3.
- HLS support depends on the selected segment format.
- WebVTT is writable in MP4/MKV/WebM style containers where supported, but check player behavior.

Before selecting a codec at runtime, intersect container support with environment support:

```ts
import {
  Mp4OutputFormat,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny';

const outputFormat = new Mp4OutputFormat();
const videoCodec = await getFirstEncodableVideoCodec(
  outputFormat.getSupportedVideoCodecs(),
  { width: 1920, height: 1080 },
);
const audioCodec = await getFirstEncodableAudioCodec(
  outputFormat.getSupportedAudioCodecs(),
);
```

## Output Format Selection

- `Mp4OutputFormat`: general web/video delivery. Options include `fastStart`, `minimumFragmentDuration`, metadata format, and MP4 box callbacks.
- `MovOutputFormat`: QuickTime output; uses MP4-family options.
- `CmafOutputFormat`: single CMAF segment; requires an init target and is often used for HLS segments.
- `WebMOutputFormat`: WebM output. Can be append-only for live/streaming contexts.
- `MkvOutputFormat`: Matroska output with broader codec support than WebM.
- `OggOutputFormat`: append-only by nature; useful for Opus/Vorbis style streaming.
- `Mp3OutputFormat`: MP3 audio-only output. `xingHeader: false` makes it append-only.
- `WavOutputFormat`: WAV/RF64 output. Use `large: true` for files over 4 GiB.
- `AdtsOutputFormat`: AAC ADTS output; append-only.
- `FlacOutputFormat`: FLAC output; can be append-only.
- `MpegTsOutputFormat`: MPEG-TS output; append-only.
- `HlsOutputFormat`: multi-file HLS output; requires `PathedTarget` and `segmentFormat`.

## MP4 Fast Start Choices

Use `new Mp4OutputFormat({ fastStart })` carefully:

- `false`: metadata at end; fastest and lowest memory, not ideal for progressive playback.
- `'in-memory'`: fast-start file but holds media chunks until finalization; good for smaller in-memory outputs.
- `'reserve'`: fast-start by reserving space; requires `maximumPacketCount` metadata on tracks.
- `'fragmented'`: append-only fragmented MP4; good for streaming, but compatibility/seeking differs and packet buffering applies.
- `undefined`: defaults depend on target; verify behavior if upload/streamability matters.

## Official Extension Packages

Use official extensions instead of custom coders when they solve the compatibility gap:

- `@mediabunny/mp3-encoder`: MP3 encoder polyfill.
- `@mediabunny/aac-encoder`: AAC-LC encoder polyfill.
- `@mediabunny/flac-encoder`: FLAC encoder polyfill.
- `@mediabunny/ac3`: AC-3/E-AC-3 decoder and encoder support.

Pattern:

```ts
import { canEncodeAudio } from 'mediabunny';
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';

if (!(await canEncodeAudio('mp3'))) {
  registerMp3Encoder();
}
```

## Custom Coders

Only implement custom coders when official extensions or native WebCodecs support are insufficient.

- Custom encoders must extend `CustomVideoEncoder` or `CustomAudioEncoder`, implement `supports`, `init`, `encode`, `flush`, and `close`, call `onPacket` for every encoded packet, and emit packets in decode order.
- Custom decoders must extend `CustomVideoDecoder` or `CustomAudioDecoder`, implement `supports`, `init`, `decode`, `flush`, and `close`, call `onSample` for every decoded sample, and emit samples in increasing presentation timestamp order.
- Register with `registerEncoder` or `registerDecoder`.
- Use the Mediabunny Codec Registry for exact packet data, codec strings, and decoder config `description` requirements.

