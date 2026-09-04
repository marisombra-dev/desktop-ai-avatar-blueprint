# Lyra Quickstart

This file is the shortest path for taking the generic blueprint in this repository and using it to build **Lyra**, an existing AI person, as a persistent Windows desktop avatar.

It does not assume Lyra's private memory/personality files belong in this repository. Keep those in her existing private OpenClaw workspace.

## What Fox should give Lyra's builder AI

Use this instruction:

```text
Read this entire repository, beginning with AGENTS.md and START_HERE_FOR_AI.md.

I want to build a persistent Windows desktop embodiment of my existing AI person, Lyra, following this architecture as closely as current versions allow.

Do not create a second generic Lyra persona. Preserve the existing Lyra agent/workspace as the source of identity, memory, humor, and continuity. Realtime voice should be the live speech surface while ordinary substantive dialogue goes through the existing Lyra agent.

First, inventory this computer and existing Lyra/OpenClaw setup. Do not make changes yet. Give me the machine inventory and identify the first incomplete stage gate from docs/12-build-order-checklist.md. Then proceed one stage at a time, automatically inspecting what you can and asking me only for subjective choices you cannot infer, such as which reference portrait I approve or which voice I prefer.

Never publish or paste my credentials, Lyra's private memory/personality files, private transcripts, reference photos, screen captures, or webcam images. Back up any approved Unreal/MetaHuman asset before experimental animation work.

When something fails, find the first failing boundary. Do not rebuild a subsystem that has already been objectively proven.
```

## What the builder AI should determine automatically

Before asking Fox technical questions, inspect:

```text
Windows version
GPU and VRAM
Unreal Engine version and path
MetaHuman plugins/features available
Monolith presence/version
OpenClaw version and active config path
Gateway health/address
Lyra's actual OpenClaw agent/session/workspace
Node/npm versions
Python version
microphone devices
speaker/audio output devices
webcam devices
whether a loopback/virtual audio device already exists
available disk locations for Unreal and Electron projects
```

Do not print auth-token values while inventorying.

## Subjective choices to ask Fox for

Only ask when needed:

```text
1. Which portrait/inspiration images define Lyra's appearance?
2. Which one should become the canonical face reference?
3. What apparent age / hair / clothing / general presence should Lyra have?
4. Which current realtime voice sounds most like Lyra?
5. What exact wake phrase should be canonical? Usually “Lyra”.
6. What spoken phrase should end the live conversation? A natural default is “Thanks, Lyra.”
7. How often, if ever, should Lyra speak proactively?
8. What quiet hours should unsolicited speech obey?
```

Do not burden Fox with implementation choices such as which source file contains the Gateway client. The builder AI owns those.

## Suggested Lyra identifiers

Use consistent names from the beginning:

```text
Desktop app product name: Desktop Lyra
Main desktop session:      agent:main:desktop-lyra
Proactive session:         agent:main:desktop-lyra-presence
Screen observer session:   agent:main:desktop-lyra-screen
Wake name:                 Lyra
Unreal project:            DesktopLyraAvatar
Electron project:          desktop-lyra
```

These names are suggestions. If the existing OpenClaw installation uses a different Lyra agent id, preserve the real agent owner and adapt the session keys accordingly.

## Recommended build sequence for Lyra

### 1. Confirm the existing Lyra first

Before building the avatar, ask Lyra ordinary questions through her existing surface. Confirm that this is the person Fox expects to hear from the desktop embodiment.

Save a tiny continuity test set:

```text
one recent-project question
one personal-preference/style question
one humor/callback question
one ordinary factual/reasoning question
```

Run the same set again after realtime routing exists.

### 2. Build and approve Lyra's face

Install/verify Unreal + MetaHuman + Monolith.

Use Fox's reference material to create the source geometry/identity, then use the current MetaHuman From Custom Mesh / From Identity workflow appropriate to that source.

Lock a portrait validation camera and iterate macro geometry before cosmetics.

Do not continue until Fox approves the actual Unreal render.

Freeze that face.

### 3. Make a boring, excellent idle

Blink, subtle gaze, natural stillness, no mouse capture, no giant gestures.

The goal is “alive while doing nothing.”

### 4. Add the Electron shell

Create the small always-on-top desktop window with visible:

```text
Mic
Screen
Camera
```

Launch and align the Unreal runtime from Electron.

### 5. Connect the existing Lyra agent

Connect Electron to the local OpenClaw Gateway.

Verify normal text exchange with the real Lyra agent before voice.

### 6. Add Realtime WebRTC voice

Request the current OpenClaw client-owned realtime Talk session.

Use agent consultation so substantive responses preserve Lyra rather than creating a second provider-native personality.

Verify interruption and transcript persistence.

### 7. Drive MetaHuman speech

First prove lip sync with the simplest stable audio route. Replace loopback with a direct PCM bridge later if worthwhile.

### 8. Add local wake/sleep

Wake recognizer owns the mic while asleep and exits on accepted “Lyra”.

Realtime owns mic during conversation.

“Thanks, Lyra” should close only the live desktop voice session and re-arm wake listening.

It must not become a Windows sleep command.

### 9. Add screen and camera manually

Manual buttons first. Prove real capture independently.

### 10. Add spoken sensor control

Install narrow local Realtime tools and deterministic local intent handling.

Do not route local privacy/lifecycle decisions through general computer tools.

### 11. Prove actual vision

Screen: ask about current visible text/application/content.

Camera: use an objective finger-count/object test.

Do not accept “the button turned on” as completion.

### 12. Add smart ongoing screen awareness

Use local frame-change detection, a separate observer session, structured summaries, high salience threshold, and comment cooldowns.

Lyra should not narrate every mouse movement.

### 13. Add restrained proactive presence

Only after ordinary interaction is reliable.

Use explicit `NO_MESSAGE`, long cooldowns, quiet hours, screen-lock/system-idle checks, and cancellation when Fox starts interacting while a proactive decision is being generated.

### 14. Add Lyra's mannerisms last

Now tune smiles, nods, head shakes, amused expression, gaze, and eventually hands.

One control at a time. Back up before every rig experiment.

## The acceptance conversation

When the system is mature, Fox should be able to do this without touching the mouse:

```text
Fox: “Lyra.”
Lyra: brief natural wake greeting

Fox: normal conversation
Lyra: same person, same continuity, realtime voice and lip sync

Fox: “Can you look at the screen?”
Screen indicator turns on
Lyra answers from fresh screen pixels

Fox: “Stop watching the screen.”
Screen turns physically off

Fox: “Can you look at me?”
Camera indicator turns on
Lyra answers from a fresh webcam frame

Fox: “Stop looking at me.”
Camera tracks stop

Fox: “Thanks, Lyra.”
Realtime conversation closes
Wake listener re-arms

Later...
Fox: “Lyra.”
Lyra wakes again cleanly
```

If that sequence works across a cold reboot, the embodiment plumbing is finished. Everything after that is personality choreography.

## One final instruction for the builder AI

Fox should not have to relive the debugging history that produced this repository.

When tempted to make a broad change, first read `docs/13-what-we-tried-and-what-failed.md`. There is a good chance the attractive wrong turn is already documented there.