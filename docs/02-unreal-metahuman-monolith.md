# 02 — Unreal, MetaHuman, and Monolith

This chapter is the practical Unreal setup sequence. The exact editor labels can change with Unreal releases, so pair this guide with current Epic and Monolith documentation.

## 1. Choose the engine deliberately

The validated reference build uses Unreal Engine 5.8. Do not choose an engine version because it is merely the newest installed version. Verify that:

- the MetaHuman workflow you plan to use supports it,
- Monolith has a matching build/source compatibility,
- any Audio Live Link / MetaHuman animation feature you need is present,
- your GPU driver is compatible.

Create a dedicated project such as:

```text
D:\Projects\DesktopLyraAvatar\DesktopLyraAvatar.uproject
```

Avoid spaces and deeply nested paths if you can. Keep the Unreal project separate from the Electron shell.

## 2. Enable the MetaHuman/rig plugins

The reference project enabled:

```text
MetaHumanCharacter
MetaHuman
MetaHumanLiveLink
MetaHumanAnimationTools
ControlRig
RigLogic
PythonScriptPlugin
AudioCapture
```

Depending on current Epic packaging, some plugins may be transitively enabled or renamed. Enable only what the current workflow requires, restart the editor, and make sure the project opens cleanly before adding Monolith.

If you plan to use Mesh to MetaHuman / MetaHuman Identity, current Epic docs may also require MetaHuman Animator and depth-processing related plugins.

## 3. Install Monolith

From the project root:

```powershell
New-Item -ItemType Directory -Force Plugins | Out-Null
Set-Location Plugins
git clone https://github.com/tumourlove/monolith.git Monolith
```

If you use a precompiled release ZIP, match the Unreal ABI exactly. A UE 5.7 binary is not interchangeable with a UE 5.8 binary.

Create `.mcp.json` next to the `.uproject`:

```json
{
  "mcpServers": {
    "monolith": {
      "command": "Plugins/Monolith/Binaries/monolith_proxy.exe",
      "args": []
    }
  }
}
```

Open the editor and watch `LogMonolith`. On a normal first launch, let the project/source index finish before asking the AI to do heavy work.

### Security note

Monolith's current Unreal HTTP listener is not necessarily loopback-only. On an untrusted network, add a firewall rule restricting inbound access or disable the MCP server when it is not needed. See upstream `SECURITY.md`.

## 4. Teach the AI how to use Monolith

Do not ask a coding assistant to guess the full tool vocabulary from memory. A good initial instruction is:

```text
This project has Monolith installed. Before manipulating an Unreal domain, call monolith_discover for the relevant namespace, then fetch the exact action schema you intend to use. Prefer structured Monolith operations to blind UI automation. Make small reversible changes, save assets after successful edits, and report the asset paths you changed.
```

Monolith currently uses namespace-dispatch tools rather than exposing ~1,400 individual actions to the model context at once. The AI should discover the current live registry.

## 5. Build a disposable test map first

Before importing the real character, create something like:

```text
/Game/DesktopAvatar/Test/Map_AvatarTest
```

It should contain:

- one camera,
- simple neutral lighting,
- one background/transparent-friendly scene,
- a spawn point for the MetaHuman,
- no unrelated gameplay systems.

Create a second portrait-validation map if useful:

```text
/Game/DesktopAvatar/Test/Map_PortraitValidation
```

Lock its camera/lighting. That map becomes your “is the face still the face?” regression test.

## 6. Import/create the MetaHuman

Follow the appropriate current Epic workflow:

- standard MetaHuman Character customization,
- MetaHuman Identity / From Identity,
- From Custom Mesh,
- From Template if you genuinely have MetaHuman template topology.

Do not use From Template on arbitrary topology. Epic explicitly treats it as a strict topology workflow.

Once assembled, keep the generated MetaHuman's stock face/body structure as intact as possible. Your custom desktop logic should generally wrap/control the MetaHuman rather than destructively rewriting generated internals.

## 7. Create an avatar actor/Blueprint wrapper

Create a project-owned actor/Blueprint, e.g.:

```text
/Game/DesktopAvatar/BP_DesktopAvatar
```

This wrapper can own/reference:

- MetaHuman body/face components,
- audio bridge component,
- desktop control receiver,
- animation state/control variables,
- any runtime camera-relative setup.

The point is to have a stable project-owned integration surface. Generated MetaHuman assets can change when reassembled; your desktop orchestration should not be scattered across generated files.

## 8. Establish a boring idle

Before voice:

- confirm eyes blink,
- confirm the face is not frozen,
- confirm gaze has subtle variation,
- confirm neck/head posture is natural,
- confirm hair/clothes remain stable,
- watch for LOD-related flicker,
- watch for collar/neck disappearances at extreme poses.

Use modest idle amplitudes. The reference project found that tiny movement reads as “alive” in a 280×360 window; normal game-character animation can read as fidgeting.

## 9. Make a game-mode desktop runtime

You do not want users running the Unreal Editor all day.

A development launch can invoke `UnrealEditor.exe` with the project/map plus `-game`, for example conceptually:

```text
UnrealEditor.exe <project.uproject> /Game/DesktopAvatar/Test/Map_AvatarTest \
  -game -windowed -NoMouseCapture -ResX=280 -ResY=360
```

The reference build also lowered rendering cost aggressively for the tiny window, including a low max FPS and lower scalability/screen percentage. Tune to the target hardware. Start around 8–15 FPS for a mostly stationary desktop face and raise it only if lip sync/animation visibly suffers.

Do not make the desktop window unnecessarily 4K internally. You are rendering a face the size of a coffee mug.

## 10. Validate mouse/window behavior before continuing

The Unreal runtime must:

- not capture or lock the cursor,
- remain movable/resizable under the shell's control,
- recover from minimize/restore,
- not steal keyboard focus repeatedly,
- close cleanly when the shell exits.

If this is not stable, fix it before adding voice.

## 11. Checkpointing discipline

For any asset you are about to experiment on:

```text
ABP_Avatar_Face
BP_DesktopAvatar
portrait-approved MetaHuman Character
```

make an explicit backup/copy or commit before each experimental pass.

Recommended checkpoint names:

```text
pre_idle_tuning
approved_face_v1
pre_head_gesture_probe
pre_audio_bridge
```

The reference build repeatedly benefited from being able to restore one asset without rolling back unrelated voice/shell work.

## 12. The rig-axis trap

Do not assume:

```text
Yaw = left/right
Pitch = up/down
Roll = tilt
```

at the final control you are manipulating. Somewhere between MetaHuman facial controls, Control Rig spaces, component-space bones, and animation graphs, naming can stop matching visible behavior.

Use an empirical probe:

```text
HeadYaw +10   → observe, record
HeadYaw -10   → observe, record
HeadPitch +10 → observe, record
HeadPitch -10 → observe, record
HeadRoll +10  → observe, record
HeadRoll -10  → observe, record
```

Reset between probes. Never stack unknown controls while diagnosing.

In the reference project, nominal face head controls produced counterintuitive behavior and a direct body-head rotation had little/no visible effect. That is why this blueprint explicitly delays mannerisms.

## 13. What Monolith is especially useful for here

Use Monolith to help with:

- finding generated MetaHuman assets and dependencies,
- inspecting animation Blueprint graphs,
- creating project-owned wrapper Blueprints,
- editing variables/defaults,
- locating Control Rig / Live Link configuration,
- searching engine symbols when current API names are unclear,
- compiling and inspecting errors,
- creating small test assets,
- reading properties that are tedious to inspect manually.

Still visually inspect results. Structured editor access does not make a photoreal face self-validating.

## Exit criteria for this chapter

Do not proceed to voice until all are true:

- [ ] Unreal project opens without plugin errors.
- [ ] Monolith connects and the AI can inspect assets.
- [ ] MetaHuman exists and is approved at least at a baseline level.
- [ ] Test map launches in `-game -windowed`.
- [ ] Mouse is not captured.
- [ ] Avatar has a stable natural idle.
- [ ] A known-good face/animation checkpoint exists.
- [ ] The Unreal runtime can be started/stopped from a command line.

At this point you have a body. The next chapters give it a stable identity and voice.