# Swappable Background Presentation Layer

The desktop avatar does not need to float forever over a transparent void. A background can add context, mood, and visual grounding without becoming part of the character itself.

The key architectural rule is:

> **Keep the person and the environment separate.**

The validated reference build ultimately used a simple Unreal composition: a dedicated runtime map containing the MetaHuman in front of a textured plane. The plane is an ordinary static mesh using a dedicated unlit material. Electron still owns the desktop shell and window placement; Unreal renders the complete little scene inside that window.

This is intentionally simpler than building the background into the MetaHuman material or routing the scene through an extra SceneCapture2D pipeline.

## Why keep the background separate?

A separate presentation layer lets the same foreground person appear in different contexts later:

- neutral room or study,
- classroom or presentation setting,
- gym or coaching setting,
- outdoor scene,
- transparent/no-background mode,
- task-specific visual context.

Changing context should not require rebuilding the face, body, clothing, lip sync, or expression rig.

## Validated Unreal mechanics

The reference scene used three dedicated assets:

1. A normal Unreal map for the composed desktop scene.
2. A `Texture2D` containing the chosen background image.
3. An opaque **Unlit** material that samples that texture and feeds it to `Emissive Color`.

The map contains:

- the existing desktop MetaHuman Blueprint,
- a camera framing the avatar,
- the character lights already needed for the avatar,
- one `StaticMeshActor` using Unreal's basic `Plane` mesh,
- the background material assigned to that plane.

Place and scale the plane behind the character until it fills the camera frustum. The plane is scenery only. It should not intersect the character or participate in the animation rig.

Using an unlit material matters. It keeps the still background visually stable while the key/fill/rim lighting remains free to illuminate the MetaHuman. Otherwise character-light tuning can unexpectedly brighten, darken, or color-shift the backdrop.

**Validation gate:** Launch the map directly with `-game -windowed`; the camera should show one clean composition of background + avatar with no missing edges and no change to blink, idle, hair, clothing, or lip-sync behavior.

## Desktop/Electron composition

The Electron shell does **not** need to paint the background itself.

The validated arrangement is:

```text
Electron companion shell/window
└── separately launched Unreal runtime, bounds-synchronized to the presentation area
    └── composed Unreal camera view
        ├── background plane
        └── MetaHuman foreground
```

Keep the Electron shell frameless/transparent as before. The Unreal window occupies the avatar presentation area and already contains the opaque background inside its rendered frame. Transparency outside that area still behaves normally, so adding a backdrop does not require turning the whole desktop overlay into an opaque rectangle.

Continue to launch the intended presentation map explicitly rather than relying on whatever map Unreal last had open. A generic pattern is:

```ts
const AVATAR_MAP = '/Game/DesktopAvatar/Presentation/Map_DesktopAvatar_Default';
const args = [projectPath, AVATAR_MAP, '-game', '-windowed', '-NoMouseCapture'];
```

The existing window-position synchronization should keep moving/resizing the Unreal runtime with Electron. Background work should not touch mouse ownership, microphone lifecycle, Realtime, or sensor privacy state.

## Making backgrounds swappable later

There are two clean extension paths.

For **still backgrounds with the same camera and character lighting**, keep one presentation map and swap the texture/material on the backdrop plane. A material instance or dynamic material instance can expose a texture parameter such as `BackgroundTexture`.

For **contexts that need different framing, props, lighting, or geometry**, use separate presentation maps and select which map Electron launches. This is usually cleaner than turning one map into a giant conditional scene.

A small registry is enough:

```ts
const PRESENTATIONS = {
  default: '/Game/DesktopAvatar/Presentation/Map_Default',
  classroom: '/Game/DesktopAvatar/Presentation/Map_Classroom',
  gym: '/Game/DesktopAvatar/Presentation/Map_Gym',
} as const;
```

Treat context selection as presentation state, not personality state. The same agent, voice, memory, and MetaHuman identity should continue underneath.

Do not let model text supply arbitrary Unreal map paths. Select only from a local whitelist.

## Common failure modes

### Baking the background into the character

Do not modify the MetaHuman skin/clothing material to carry scenery. That couples identity to presentation and makes later context changes painful.

### Letting the plane react to character lighting

Use an unlit backdrop material for a photographic/still background unless you deliberately want scene lighting to affect it.

### Wrong aspect ratio or uncovered edges

Scale/crop the plane for the actual runtime camera and window aspect ratio. Test resizing if the companion window is resizable.

### Background steals depth from the face

Keep it visually subordinate. A highly detailed or high-contrast scene can make a small desktop face harder to read even when the Unreal composition is technically correct.

### Accidental mouse regression

Background changes are visual only. Preserve `-NoMouseCapture` and the existing Electron/Unreal window ownership behavior.

### Publishing private or uncleared imagery

The mechanics are reusable; the chosen image may not be. Public repositories should use original/cleared example imagery or omit the texture entirely and document the slot.

**Final acceptance test:** The avatar launches in the intended background, remains draggable/resizable, keeps a free mouse, preserves all animation/voice behavior, and changing/removing the background does not require editing the MetaHuman itself.
