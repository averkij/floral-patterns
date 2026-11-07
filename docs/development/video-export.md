# Browser video export

Implemented 2026-11-07 for **Цветочник**. After generating a current composition, **Скачать MP4** renders and downloads the growth animation locally. It includes the paper, all botanical elements, visitors and the text with its chosen font, size and color. Editing guides are excluded. Live animation may be off; the application retains the compact event schedule in either case. The shape experiment continues to offer SVG only.

## Rendering and encoding

`src/growth-renderer.ts` is shared by the live preview and export. It prepares bounded raster fragments from the final SVG and draws any requested timestamp using the existing stem reveals and motif scaling. Export additionally rasterizes the SVG's text layer, including its embedded calligraphy font. Text is visible throughout the clip.

`src/video-export.ts` uses the unmodified, pinned Mediabunny 1.65.2 library and the browser's WebCodecs encoders. It probes H.264 at the actual output settings first and writes MP4 when supported. Otherwise it tries VP9, then VP8, in WebM. If none can encode, the interface explains that video is unavailable while preserving SVG export. There is no server, FFmpeg/WASM download, runtime CDN or cross-origin isolation requirement. Vite loads the encoding dependency as a separate chunk after the first current page composition exists; its URL respects `/floral-patterns/`.

Output is portrait **764 × 1080 at 30 fps**, targeting 4 Mbit/s with no audio. Growth takes 10–24 seconds, matching the preview's timeline normalization, followed by a two-second hold. Frames have explicit timestamps and are submitted with encoder backpressure, so a slow export does not drop animation frames. Runtime and final size depend on the scene, device and browser. MP4 encoder availability is detected rather than inferred from the browser name.

The progress indicator covers preparation, encoding and finalization. Cancellation, changed generation inputs, regeneration and leaving the page experiment abort ongoing work and release the encoder, fragment canvases and download URL. After success the URL remains available for another click until the composition changes or the component unmounts. The compressed output is buffered in memory; full-page frame arrays are not retained. Intricate scenes can reduce fragment raster resolution to stay within the existing 24-million-pixel cache budget, then scale to the fixed output dimensions.

## Verification

Production output was tested in headless Edge under `/floral-patterns/`, with actual browser downloads and FFmpeg decoding:

- H.264 MP4: 764 × 1080, 30 fps, 408 frames / 13.6 seconds for the low-density seed-42 fixture. Cyrillic Great Vibes text and its custom color were included.
- With H.264 support deliberately disabled, a real VP9 WebM encoded and downloaded at the same dimensions and frame rate.
- With VideoEncoder unavailable, video was disabled with an explanation and SVG remained available.
- Mid-encode cancellation produced no download; retry and repeated download succeeded. Editing invalidated an existing video. Switching experiments cancelled export and the shape SVG remained usable.
- Default-density seed 42 played through the shared preview and exported a 468-frame / 15.6-second MP4 (about 2 MB). The FFmpeg-decoded final frame was visually checked and compared with the rasterized SVG (mean absolute RGB channel error 4.03/255; video is lossy). Turning preview animation off preserved the exact SVG. No application console errors were observed.
- A 390-pixel viewport had no horizontal overflow. These are desktop Edge checks with an emulated viewport, not physical-device or Safari/Firefox validation.

Relevant sources: [Mediabunny media sources](https://mediabunny.dev/guide/media-sources), [writing media files](https://mediabunny.dev/guide/writing-media-files), and [supported formats and codecs](https://mediabunny.dev/guide/supported-formats-and-codecs). Installed type definitions and source were checked against the pinned version. The MPL-2.0 notice and exact corresponding source link are in [third-party notices](../../THIRD_PARTY_NOTICES.md).
