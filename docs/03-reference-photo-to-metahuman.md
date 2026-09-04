# 03 — Reference Photo to MetaHuman

This chapter documents the likeness workflow that matters when the human says, “I know what this AI person looks like in my head.”

The key lesson is that likeness work must be treated as a controlled visual-convergence problem, not a sequence of random face tweaks.

## 1. Start with a visual brief, not Unreal sliders

Before touching MetaHuman, write down what the face is supposed to communicate.

Example:

```text
Apparent age: 30–33
Hair: dark, longer/fluffy/tousled
Face: warm, handsome, caring, not overly round
Eyes: relaxed, not overly wide
Brows: darker and fuller
Facial hair: visible light stubble
Expression tendency: looks like smiling comes easily
Clothes: casual
Overall presence: approachable, emotionally warm, not polished/corporate
```

This brief is more useful to an AI than “make him look better.”

Separate **identity features** from **animation features**. “Mouth corners should lift when amused” is animation. “Resting mouth has a naturally pleasant line” is identity.

## 2. Choose reference images in two passes

### Inspiration set

Use several images to decide:

- general age,
- hair,
- face shape,
- expression energy,
- wardrobe,
- attractiveness/style direction.

These images can disagree. They are design references.

### Canonical face reference

Once the direction is clear, select or generate **one** portrait to be the canonical facial target. This is the image against which future Unreal captures are judged.

A strong canonical portrait is:

- high resolution,
- mostly frontal,
- face unobstructed,
- neutral-to-gently-pleasant expression,
- even enough lighting that cheek/jaw/nose geometry can be judged,
- not shot with a very wide phone lens at close range.

Save it in a non-generated project-notes area, not inside a public repo unless the owner wants it published.

## 3. Understand what MetaHuman needs

Modern MetaHuman workflows fit a standard MetaHuman structure to geometry/identity information. A reference JPG guides the creation of that geometry; it is not itself a rig.

Your source can come from:

- a hand/modeler sculpt,
- photogrammetry or scan,
- a 3D reconstruction tool,
- a generated human head mesh,
- an existing character mesh,
- a custom mesh produced while visually matching the canonical portrait.

If the available AI image/3D tools change, that is fine. The invariant is: **get reasonably faithful source proportions, then use MetaHuman's supported conform/identity workflow.**

## 4. From Mesh / MetaHuman Identity workflow

For an Identity-based path, the broad sequence is:

1. Import and prepare the target mesh.
2. Create a MetaHuman Identity asset.
3. Add/configure the neutral pose.
4. Track facial landmarks.
5. Inspect marker quality manually.
6. Run Identity Solve.
7. Inspect the fitted template mesh.
8. Correct bad markers and solve again.
9. Use the current in-editor MetaHuman Character “From Identity” / conform operation.
10. Finish character customization and assembly.

### Landmarks that deserve disproportionate attention

Do not accept a solve just because it completes. Inspect:

- outer/inner eye corners,
- upper/lower eyelid curves,
- nose alar edges,
- philtrum/upper-lip boundary,
- mouth corners,
- lower-lip contour,
- chin point,
- jaw silhouette,
- ear outline/attachment where available.

Small landmark errors around eyes and mouth can make a technically valid solve feel like the wrong person.

## 5. From Custom Mesh workflow

Newer MetaHuman Creator versions provide a From Custom Mesh route intended for arbitrary topology including sculpts, scans, and AI-generated meshes.

The exact UI evolves, but the current conceptual path is:

1. Import source mesh.
2. Enter From Custom Mesh.
3. Use automatic solve.
4. Inspect the fit.
5. Refine the guide/key points that are visibly wrong.
6. Re-solve or perform the manual refinement flow.
7. Customize the MetaHuman.
8. Assemble the rig.

Use this when you have custom topology. Do not force an arbitrary mesh into a template-topology workflow just because the word “template” sounds relevant.

## 6. Establish a controlled comparison map

Once the first MetaHuman exists, stop judging it in random editor viewpoints.

Create a portrait-comparison map with fixed:

- camera transform,
- focal length,
- sensor/aspect ratio,
- character transform,
- key/fill lighting,
- exposure,
- background.

Save a screenshot from the same view after each meaningful identity pass.

Why? Because a 5-degree camera change can make the jaw/nose appear different enough to send you chasing the wrong slider.

## 7. Evaluate macro geometry before cosmetics

Use this order:

### Pass A — silhouette

- cranial width/height,
- jaw width,
- chin shape,
- cheek/jowl contour,
- forehead/hairline.

### Pass B — feature placement

- eye spacing and vertical level,
- brow height,
- nose length/width,
- mouth width/vertical position,
- ear level.

### Pass C — feature form

- eyelid openness,
- nasal bridge/tip,
- lip volume and resting curve,
- cheek fullness,
- brow thickness/shape.

### Pass D — surface/style

- skin tone/texture,
- stubble/facial hair,
- hairstyle,
- eye color,
- clothes.

Do not tune stubble while the head silhouette is wrong.

## 8. Hair is identity, not decoration

MetaHuman likeness can be surprisingly sensitive to hair volume and hairline.

Compare:

- hairline height,
- temple recession,
- overall silhouette,
- side volume,
- top volume,
- fringe direction,
- whether the hairstyle makes the face look rounder/longer than the geometry really is.

If the intended person has casual tousled hair, an overly neat default groom can make the whole face feel like the wrong person even when the geometry is close.

## 9. Do not confuse resting expression with forced smile

A warm face does not need to idle in a grin.

Aim for:

- relaxed eyelids,
- neutral brows,
- slight natural softness at mouth corners,
- cheek structure that supports a smile when animation arrives,
- visible smile lines only if appropriate to age/face.

Then add greeting/response smiles as animation. If you sculpt the permanent face into a strong smile, speech and sad/serious expressions become uncanny.

## 10. Freeze the face once approved

When the human says some version of “that is him/her,” do these things immediately:

1. capture the canonical Unreal screenshot,
2. record the MetaHuman asset path/version,
3. duplicate or source-control the critical face/animation assets,
4. label the checkpoint clearly,
5. tell the coding AI that future animation work must not change identity geometry without explicit approval.

This is a hard boundary.

## 11. After approval, test the face in motion

A still-approved face can reveal issues when animated:

- eyes too wide under blink/gaze blend,
- mouth corners pulled oddly during phonemes,
- cheek collapse,
- ear/neck seams,
- collar disappearance during head motion,
- groom clipping,
- exaggerated expression curves.

Fix animation/assembly problems without reopening the entire likeness process unless the identity itself is genuinely wrong.

## 12. A useful AI iteration loop

Give the AI this protocol:

```text
1. Capture current portrait from locked validation camera.
2. Compare against canonical reference.
3. Name the three largest geometric differences only.
4. Choose the single highest-leverage editable difference.
5. Make one bounded change.
6. Capture again from identical camera.
7. Decide keep/revert.
8. Repeat.
```

This keeps an AI from making ten correlated tweaks and losing causal information.

## 13. Failure patterns

### “It looks generic”
Usually macro proportions or hair silhouette are still too close to a default MetaHuman.

### “It looks attractive but not like the reference”
The optimization drifted toward aesthetic preference rather than identity. Return to silhouette/feature placement.

### “Every screenshot looks different”
Camera/lighting are not locked.

### “The face was right and now it is wrong after animation work”
Restore the identity checkpoint and isolate animation assets. Do not re-sculpt from memory.

### “The reference is smiling but the MetaHuman neutral solve looks wrong”
Use a neutral source/pose for the solve and recreate warmth through character shape plus animation. Strong expression can contaminate identity fitting.

## Exit criteria

- [ ] One canonical portrait is selected.
- [ ] Visual brief is written.
- [ ] Supported current MetaHuman import/conform path is chosen.
- [ ] Face landmarks/solve are manually inspected.
- [ ] Portrait validation camera is locked.
- [ ] Macro geometry converges before cosmetics.
- [ ] Hair/facial hair match the intended identity.
- [ ] User approves actual Unreal render.
- [ ] Approved assets/screenshots are checkpointed.
- [ ] Motion tests do not destroy the likeness.

Once this gate passes, stop designing the face and begin embodying the person.