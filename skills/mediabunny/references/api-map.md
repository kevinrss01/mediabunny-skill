# API Map

Use this as a navigation aid. For exact signatures, run `scripts/mediabunny-docs.mjs symbol <Name>` or inspect `node_modules/mediabunny`.

## Core Reading

- `Input`: root object for reading one media source.
  - Create with `{ source, formats }`.
  - File-level methods include `canRead`, `getFormat`, `getMimeType`, `computeDuration`, `getDurationFromMetadata`, `getFirstTimestamp`, `getMetadataTags`, `getTracks`, `getVideoTracks`, `getAudioTracks`, `getPrimaryVideoTrack`, `getPrimaryAudioTrack`, and `dispose`.
- `InputTrack`: common track metadata and operations.
  - Properties include `id`, `number`, `type`.
  - Common methods include `getLanguageCode`, `getName`, `getDisposition`, `getBitrate`, `getAverageBitrate`, `getCodec`, `getCodecParameterString`, `canDecode`, `computeDuration`, `getDurationFromMetadata`, `getFirstTimestamp`, `getTimeResolution`, `computePacketStats`, `isLive`, `getLiveRefreshInterval`, `isRelativeToUnixEpoch`, and pairability helpers.
- `InputVideoTrack`: video-specific metadata.
  - Methods include `getCodedWidth`, `getCodedHeight`, `getSquarePixelWidth`, `getSquarePixelHeight`, `getDisplayWidth`, `getDisplayHeight`, `getRotation`, `getPixelAspectRatio`, `getDecoderConfig`, `getColorSpace`, and `hasHighDynamicRange`.
- `InputAudioTrack`: audio-specific metadata.
  - Methods include `getNumberOfChannels`, `getSampleRate`, and `getDecoderConfig`.
- `InputTrackQuery`: filter/sort tracks. Helpers include `asc`, `desc`, and `prefer`.

## Input Formats

- Use singleton input formats for tree shaking: `MP4`, `QTFF`, `WEBM`, `MATROSKA`, `OGG`, `MP3`, `WAVE`, `ADTS`, `FLAC`, `MPEG_TS`, `HLS`.
- `ALL_FORMATS` supports every ordinary container.
- `HLS_FORMATS` supports HLS playlist input.
- Each input format has `name` and `mimeType`.

## Input Sources

- `BlobSource`: browser `Blob` or `File`. Good default for upload/file-picker workflows.
- `BufferSource`: in-memory `ArrayBuffer` or view.
- `UrlSource`: URL/range-based network source.
- `ReadableStreamSource`: stream source. Avoid progress calculation on append-only streams when performance matters.
- `FilePathSource`: server-side path source for Node/Bun/Deno style runtimes.
- `StreamSource`, `RangedSource`, `PathedSource`, `CustomPathedSource`: use for advanced streaming and multi-file inputs.

## Media Sinks

Sinks are scoped to a track and read media lazily. Async iterators release resources on `break`, but if manually calling `.next()`, call `.return()` when finished.

- `EncodedPacketSink`: reads raw encoded packets from any track.
  - Methods include `getPacket`, `getKeyPacket`, `getFirstPacket`, `getFirstKeyPacket`, `getNextPacket`, `getNextKeyPacket`, and `packets`.
  - Packets iterate in decode order.
  - Options include `metadataOnly`, `verifyKeyPackets`, and live-wait controls.
- `VideoSampleSink`: reads decoded `VideoSample` frames from an `InputVideoTrack`.
  - Methods include `getSample`, `samples`, and `samplesAtTimestamps`.
  - Operations use presentation order.
- `CanvasSink`: reads video frames as canvas wrappers and can resize, rotate, crop, fit, preserve alpha, and reuse canvases with `poolSize`.
  - Methods include `getCanvas`, `canvases`, and `canvasesAtTimestamps`.
- `AudioSampleSink`: reads decoded `AudioSample` chunks from an `InputAudioTrack`.
  - Methods include `getSample`, `samples`, and `samplesAtTimestamps`.
- `AudioBufferSink`: reads `AudioBuffer` wrappers for Web Audio.
  - Methods include `getBuffer`, `buffers`, and `buffersAtTimestamps`.

## Packets And Samples

- `EncodedPacket`: wrapper around encoded audio/video chunks.
  - Common fields include `data`, `type`, `timestamp`, `duration`, and metadata-only status.
  - Convert to WebCodecs chunks with methods such as `toEncodedVideoChunk` and `toEncodedAudioChunk`.
- `VideoSample`: decoded frame wrapper.
  - Use `draw(...)`, `clone`, `close`, `toVideoFrame`, and timestamp helpers.
  - Close when done.
- `AudioSample`: decoded audio wrapper.
  - Use `allocationSize`, `copyTo`, `clone`, `close`, `toAudioData`, `toAudioBuffer`, and `fromAudioBuffer`.
  - Close when done.

## Core Writing

- `Output`: root object for writing one media output.
  - Create with `{ format, target }`, plus optional init target for segment formats.
  - Add tracks with `addVideoTrack`, `addAudioTrack`, and `addSubtitleTrack`.
  - Write metadata with `setMetadataTags` before `start`.
  - Lifecycle: `start` -> add media -> `finalize`, or `cancel`.
  - Inspect `state` and `getMimeType`.
- `OutputTrackGroup`: controls pairability for multi-track outputs such as HLS.
- Track metadata includes language, name, disposition, rotation, frame rate, and maximum packet count.

## Output Targets

- `BufferTarget`: writes a complete in-memory `ArrayBuffer`. Best for small/medium outputs.
- `StreamTarget`: writes `StreamTargetChunk` objects to a `WritableStream`; chunks include byte positions.
- `AppendOnlyStreamTarget`: writes sequential `Uint8Array`s, but only valid with append-only output format configuration.
- `FilePathTarget`: server-side file path output.
- `PathedTarget`: maps paths to targets for multi-file outputs such as HLS.
- `NullTarget`: discards bytes; useful when relying on format callbacks.

## Media Sources

Always await `.add(...)` for backpressure, and call `.close()` when a source is done.

- `VideoSampleSource`: encodes `VideoSample` frames.
- `CanvasSource`: captures a canvas at explicit timestamps/durations.
- `MediaStreamVideoTrackSource`: pipes a live `MediaStreamTrack`.
- `EncodedVideoPacketSource`: writes already-encoded video packets. Add packets in decode order and provide decoder metadata on the first packet when needed.
- `AudioSampleSource`: encodes `AudioSample` chunks.
- `AudioBufferSource`: appends `AudioBuffer`s for Web Audio workflows.
- `MediaStreamAudioTrackSource`: pipes live audio tracks.
- `EncodedAudioPacketSource`: writes already-encoded audio packets with decoder metadata when needed.
- `TextSubtitleSource`: writes WebVTT subtitle text.

## Conversion

- `Conversion.init(options)` creates a conversion; `execute()` runs it; `cancel()` stops it.
- `ConversionOptions` commonly include:
  - `input`, `output`
  - `tracks: 'all' | 'primary'`
  - `video` object, function, or array for fan-out
  - `audio` object, function, or array for fan-out
  - `trim: { start?, end? }`
  - `tags` object or callback
  - `showWarnings`
- `ConversionVideoOptions` can discard, resize, fit, rotate, crop, set frame rate, choose codec/bitrate, preserve alpha, set key frame interval, force transcode, process samples, and fan out with track groups.
- `ConversionAudioOptions` can discard, choose codec/bitrate, change channel count, resample, force transcode, and process samples.
- `conversion.discardedTracks` reports why tracks were dropped.
- `conversion.utilizedTracks` reports tracks used in the output.

## Codec Helpers

- Encoding: `canEncode`, `canEncodeVideo`, `canEncodeAudio`, `canEncodeSubtitles`, `getEncodableCodecs`, `getEncodableVideoCodecs`, `getEncodableAudioCodecs`, `getEncodableSubtitleCodecs`, `getFirstEncodableVideoCodec`, `getFirstEncodableAudioCodec`, `getFirstEncodableSubtitleCodec`.
- Decoding: `canDecode`, `canDecodeVideo`, `canDecodeAudio`, `getDecodableCodecs`, `getDecodableVideoCodecs`, `getDecodableAudioCodecs`.
- Custom coders: `CustomVideoEncoder`, `CustomAudioEncoder`, `CustomVideoDecoder`, `CustomAudioDecoder`, `registerEncoder`, `registerDecoder`.
- Quality constants: `QUALITY_VERY_LOW`, `QUALITY_LOW`, `QUALITY_MEDIUM`, `QUALITY_HIGH`, `QUALITY_VERY_HIGH`.

