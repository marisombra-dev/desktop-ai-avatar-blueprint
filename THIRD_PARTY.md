# Third-Party Software and Services

This repository is a build blueprint. It does not redistribute or relicense the third-party projects and services it describes.

## Epic Games Unreal Engine and MetaHuman

Unreal Engine and MetaHuman are Epic Games technologies and remain subject to Epic's current licenses, service terms, content licenses, and redistribution rules.

Official documentation:

https://dev.epicgames.com/documentation/unreal-engine/

https://dev.epicgames.com/documentation/metahuman/

Do not assume that an assembled MetaHuman, groom, clothing asset, plugin binary, or Epic sample asset can be copied into a public repository merely because the project itself is public.

## Monolith

Monolith is a third-party MCP plugin for Unreal Engine:

https://github.com/tumourlove/monolith

At the time this notice was written, upstream Monolith is MIT licensed. Use the current upstream `LICENSE`, `ATTRIBUTION.md`, and release notes as authoritative.

This repository does not include Monolith source or binaries. Installation instructions point users to upstream.

## OpenClaw

OpenClaw is a separate project/service stack:

https://openclaw.ai/

https://docs.openclaw.ai/

This repository does not redistribute OpenClaw, its state database, user workspaces, credentials, or private agent memory.

## OpenAI

OpenAI Realtime and related API services are external services and remain subject to OpenAI's current terms, policies, pricing, model availability, and API documentation.

Official developer documentation:

https://developers.openai.com/api/docs/guides/realtime

This repository does not contain an OpenAI API key, OAuth credential, ChatGPT subscription credential, or provider token.

## Electron

Electron is an open-source desktop framework:

https://www.electronjs.org/

Use current upstream licensing and package metadata for the exact version included in your application.

## faster-whisper and dependencies

The reference wake listener uses `faster-whisper`, NumPy, and `sounddevice`.

https://github.com/SYSTRAN/faster-whisper

Each package retains its own license and transitive dependencies. Review them before redistribution.

## Generated/Reference Images

Reference portraits, private inspiration photographs, webcam images, screen captures, and user-specific character assets should not be assumed to be redistributable. Keep them out of a public implementation repository unless the owner has intentionally cleared them for publication.

## This repository

The original explanatory documentation and original sanitized glue-code examples in this repository are licensed under the repository `LICENSE`. That license does not extend to third-party components described above.