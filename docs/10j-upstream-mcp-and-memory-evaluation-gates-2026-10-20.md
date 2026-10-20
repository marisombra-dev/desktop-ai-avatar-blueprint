# Optional October 2026 upstream tools: evaluation gates (NOT validated)

Reviewed 2026-10-20. The live reference build continues to use its tested
Windows-Use/UI Automation, Monolith/Unreal and existing shared continuity.
These projects are upstream research leads, **not installed dependencies** or
evidence that the reference build supports their interfaces.

## 1. munim-computer-use: foreground honesty for Windows hands

Upstream: https://github.com/munimtechnologies/munim-computer-use (Apache-2.0).

This MCP tool is interesting for its **reported actuation mechanism** and
visible agent pointer. Native UIA patterns and some classic Win32 window
messages can operate without moving the user's physical pointer. However,
upstream says other Windows controls, particularly Chromium, Electron, WPF
and UWP, may require foreground mouse movement. Keyboard events target the
focused window.

What to borrow: `look → semantic target → act → verify` receipts that also
include `input_method = uia-pattern | posted-window-message | physical-cursor`.
Do not infer non-interference from the mere presence of an MCP server.

Evaluation gates:

1. Keep existing deterministic browser/window/file controls first. Do not
   start another autonomous agent or grant shell execution to a UI helper.
2. In a disposable Windows test account, confirm UIA selection, window ID,
   uniqueness, postcondition, and same-user-turn ownership.
3. Show a visible UI signal and require a separate grant before any
   physical-cursor fallback; refuse when focus/target identity changes.
4. Gate authenticated Chrome access and forbid hidden password/2FA capture.
5. Reject ambiguous controls and destructive operations by default.

This reference build has not validated munim on the live desktop.

## 2. VibeMetaHumans: an *editor authoring* experiment, not avatar runtime

Upstream: https://github.com/kevinpbuckley/VibeMetaHumans (MIT).

The upstream advertises UE 5.8 editor MCP access to MetaHuman creation,
wardrobe, rigging, Animator and Live Link. Its README expressly says the
first cut has **not been compiled or exercised in the editor**. The generic
`MetaHumanObjectService.call_function` escape hatch can reach broad UFUNCTION
authority and must not be exposed on a working character project.

Evaluation gates:

1. Branch/copy the Unreal project and duplicate approved body/face/groom
   assets; do not reassign skeletons or alter the reference MetaHuman.
2. Check exact UE 5.8 point release, Toolset Registry/MCP availability,
   optional MetaHuman content, Epic account/cloud terms, and plugin license.
3. Build from source in the disposable project; record *compile* and
   *startup* outcomes separately.
4. First allow only `get_status` / asset listing. Verify that all editor
   services are bound to loopback and not exposed on a LAN.
5. In a separate namespace create a **dummy** character, examine asset
   diffs/undo behavior and restart/reopen stability.
6. Test one authoring operation at a time, and independently revalidate the
   previously working speech lip-sync, greeting, gaze, clothing, and walking.
7. Reject generic reflection invocation from untrusted prompts; only a narrow
   explicit allowlist may graduate to the production editor workflow.

Never import Epic MetaHuman assets into a public source repository without
checking the applicable asset and service terms.

## 3. Provena: explaining which context was delivered

Upstream: https://github.com/admiralpunk/Provena (MIT).

Provena links structured claims to immutable evidence and records the claims
returned on retrieval. That does not prove the model used a particular
claim. Our reference build already has a separate provenance and Obsidian
continuity design. Adding a second memory authority would risk duplicate and
conflicting identity context.

Borrow only the *retrieval receipt* pattern: exact returned opaque record IDs,
evidence state, scope, and time for each memory lookup, kept in private local
storage with an explicit opt-in. Do not copy raw transcripts into an analytics
or agent-service log. Companion Engine's independently tested,
content-free decorator is documented in its
`docs/UPSTREAM_ADOPTION_2026-10-20.md`; it is optional and does not change
this working reference installation.

## 4. OpenCapX: plugin trust design, not a replacement permissions layer

Upstream: https://github.com/opencapx/OpenCapX (Apache-2.0).

Useful patterns include manifest-scoped capabilities, separate agent and
plugin permissions, out-of-process JSON-RPC, signing/revocation, decision
audits and a global disable switch.

A signature authenticates a package, **not the safety of its behavior**.
A child process is not automatically OS-sandboxed. Command interception and
rewrites are especially broad: missing/unparseable rules must *deny*, never
silently allow, and arbitrary shell or credential authority must not pass
through a generic `execute` capability.

Our established computer-control policy and credential store remain the
single authority. This project's entire runtime and plugin marketplace are
**not** part of the reference blueprint.

## Status and license summary

| Source | License checked 2026-10-20 | Adoption | Validation |
| --- | --- | --- | --- |
| munim-computer-use | Apache-2.0 | Cursor-vs-background honesty and action evidence | Design only; no reference run |
| VibeMetaHumans | MIT | Safe editor evaluation sequence | Uncompiled/unvalidated upstream first cut |
| Provena | MIT | Memory retrieval attribution | Companion Engine opt-in implementation tested; no reference installation |
| OpenCapX | Apache-2.0 | Two-layer plugin trust and kill-switch requirements | Design only; no reference run |

No source or binaries were redistributed; all projects and transitive
dependencies retain their own current upstream terms. Use current primary
sources and repeat the security/license check before each real installation.
