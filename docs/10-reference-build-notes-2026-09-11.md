# 10 — Reference Build Notes: 2026-09-11

This note records three late-stage findings from the living-environment reference build: a smoother direct-PCM lip-sync cadence, a necessary distinction between desktop screen awareness and Wide View self-awareness, and an unresolved media-decoder stability problem in rotating live webcam feeds.

The status labels matter. A design can be correct and partially implemented without yet being human-validated end to end.

## 1. Direct PCM lip sync: smaller cadence plus explicit settling silence

**Status: IMPLEMENTED, TYPECHECKED, BUILT; awaiting broader long-form visual comparison**

The direct PCM route remains the same fundamental architecture described in `04-voice-and-lipsync.md`:

```text
Realtime remote audio
        ↓
Web Audio PCM tap
        ↓
Electron IPC
        ↓
loopback UDP
        ↓
Unreal C++ bridge
        ↓
FMetaHumanAudioBaseLiveLinkSubject
        ↓
MetaHuman speech-animation solver
```

A comparison with a sibling avatar implementation exposed two concrete differences that appeared to produce smoother mouth motion and cleaner phoneme endings:

1. feed the Unreal bridge in **512-sample Float32 mono PCM chunks at 16 kHz**, approximately **32 ms per chunk**, rather than 1024-sample / ~64 ms chunks;
2. provide an explicit **~300 ms zero-energy silence flush** around speech transitions, especially after audible speech finishes.

The silence tail is not cosmetic. It gives the speech-animation solver real zero-energy frames after the final phoneme so the mouth can settle naturally rather than hanging on the last shape or snapping shut when the realtime session disappears.

### Packet-size trap

Do not implement the 300 ms tail as one giant Float32 packet if the bridge has a small packet guard.

At 16 kHz, 300 ms is about 4800 float samples, or roughly 19.2 KB before transport overhead. In the reference build, the local forwarding path rejects packets above 16 KB. A naive single-packet silence tail would therefore be silently discarded.

The working pattern is to send silence using the same bounded cadence as speech:

```text
remaining silence samples
        ↓
min(512, remaining)
        ↓
Float32 zero buffer
        ↓
bridge packet
        ↓
~32 ms pacing
        ↓
repeat until ~300 ms is delivered
```

### Do not trust `response.done` as speaker completion

Provider completion and physical playback completion are different events. `response.done` can arrive while buffered audio is still audible.

For ordinary realtime speech, the reference renderer now watches actual output energy and waits until audible speech has gone quiet before flushing the ~300 ms silence tail.

For short-lived proactive/playback-only speech, the implementation already had an audible-drain wait; the explicit silence tail is added after that drain rather than immediately on provider completion.

This preserves the useful lesson from `04-voice-and-lipsync.md`: **provider lifecycle is not the same thing as speaker lifecycle**.

### Practical recommendation

For a direct MetaHuman Audio Live Link bridge, start with:

- Float32 mono PCM;
- 16 kHz sample rate if that is the solver input you have already validated;
- 512-sample chunks (~32 ms);
- bounded localhost packets;
- an explicit paced ~300 ms zero-energy tail after audible speech;
- an AudioWorklet rather than ScriptProcessor for a production cleanup if the browser/runtime supports the migration cleanly.

Do not retune an otherwise good solver because one extremely short word looks imperfect. Judge lip sync over ordinary sentences, pauses, consonants, vowels, and turn endings.

## 2. Wide View visual awareness must change the capture source

**Status: MAIN CAPTURE ROUTING AND WATCHER PATCHED; voice semantics/routing still being completed; end-to-end human validation pending**

The reference build has two distinct visual spaces:

- **Close View**: the avatar is a desktop companion and “Screen” means the human user's Windows desktop;
- **Wide View**: the avatar is physically present inside the Unreal living environment, and questions such as “what do you see out your window?” refer to the avatar's own room and current Unreal view.

The original screen-awareness design did not distinguish those spaces. `desktopCapturer` always sampled the primary Windows display. Entering Wide View changed presentation and avatar behavior, but not the visual source supplied to the model.

That produced a subtle but serious failure mode:

```text
Close View screen sharing ON
        ↓
model receives desktop frames/context
        ↓
enter Wide View
        ↓
same screen-awareness state remains ON
        ↓
model still receives / remembers desktop frames
        ↓
user asks about avatar's room or window
        ↓
assistant answers from stale desktop context or reaches for webcam
```

This is not merely a prompt problem. The sensor source itself is wrong.

### Correct architecture

Screen awareness should be view-aware:

```text
if Close View:
    Screen source = user's selected/primary desktop display

if Wide View:
    Screen source = the Unreal avatar window / living environment
```

The continuous screen watcher and one-shot frame capture must use the **same source-selection rule**. Otherwise the live model can receive one source through an explicit “look” request and a different source through background observations.

The current repair changes the capture selection layer rather than creating a second unrelated awareness subsystem. The goal is one privacy/control state with a view-dependent visual target.

### Semantic distinction: Screen vs Camera

The conversational control layer also needs an explicit distinction:

- **Camera** = the human user's webcam and physical surroundings;
- **Screen in Close View** = the human user's desktop;
- **Screen in Wide View** = the avatar's own Unreal room/window view.

Without that distinction, a request such as “look out your window” can be misinterpreted as “turn on the webcam,” causing the avatar to describe the user's physical room instead of its own environment.

Wide View voice guidance should therefore make statements such as these unambiguous:

```text
In Wide View, your room and window are visible through the Wide View screen source.
The webcam shows the user, not your own room.
When the user asks what you see in your room or out your window, use Wide View screen awareness, not the webcam.
```

### Clear stale visual context when the world changes

Changing from Close to Wide View, or Wide back to Close, should invalidate cached visual summaries from the previous space. A prior desktop frame must never be treated as current evidence about the Unreal room.

The same rule applies in reverse: a Wide View room observation should not silently remain “current screen” after returning to the desktop companion view.

The reference implementation is being adjusted so the watcher resets its comparison/history state when the capture target changes. The realtime conversation also needs a short system-level context notice telling it that older visual information belongs to the previous view and is no longer current.

### Validation checklist for the completed repair

Test these as separate cases:

- Enter Wide View with Screen OFF, ask the avatar to turn screen awareness on, then ask what it sees in its room.
- Ask specifically what is visible out the Wide View window.
- Confirm the avatar does **not** enable the user's webcam for those requests.
- Turn awareness off by voice while remaining in Wide View.
- Turn screen awareness on in Close View, then enter Wide View and confirm the next visual answer comes from the Unreal room rather than the old desktop.
- Return to Close View and confirm Wide View observations are no longer treated as current desktop evidence.

Until those cases are human-validated, this should not be marked PROVEN in the status ledger.

## 3. Rotating live webcam feeds can crash the Unreal runtime

**Status: OPEN STABILITY ISSUE; reproduction confirmed across multiple feeds**

The Wide View window can display rotating public webcam streams. The Electron shell can remain alive while the Unreal avatar/runtime disappears. Crash logs repeatedly point into Unreal's Electra media stack, including modules such as:

```text
ElectraSamples
ElectraDecoders
ElectraPlayerRuntime
```

Observed failures have included access violations and codec-specific-data assertions. Because the Electron controls can remain visible after the Unreal process dies, this can initially look like an Electron/avatar-shell crash even though the failing process is the Unreal media runtime.

### Important finding: do not blacklist one camera and declare victory

The crash reproduced on more than one webcam feed. That makes a single bad URL an inadequate explanation.

The feed catalog can remain large and independently randomized; stability work should happen at the media-ingestion boundary rather than by progressively deleting cameras until the symptom becomes rare.

### HLS irregularities matter

Some public webcam HLS manifests are not clean, uniform production streams. Logs have shown cases such as:

- playlist not multivariant;
- missing `CODECS` metadata;
- changing or inconsistent stream characteristics.

A browser player may tolerate these conditions differently from Unreal Electra. Treat arbitrary public HLS as hostile/irregular input, not as a stable local media file.

### Forced WMF was tested and rejected

A forced Windows Media Foundation experiment did **not** solve the issue. In the reference build, those streams rendered black and WMF reported unsupported byte-stream types. The forced WMF path was removed and automatic/default player selection restored.

That failed experiment is worth recording because it prevents repeating the same detour.

### Recommended next experiment: local relay/remux boundary

Before rewriting the room/window feature or shrinking the webcam catalog, test a small local FFmpeg relay/remux layer:

```text
public HLS/webcam source
        ↓
local FFmpeg process
        ↓
normalize/remux to a stable local format/codec profile
        ↓
Unreal media player
```

The purpose is not transcoding for visual quality. It is to put a predictable media boundary between irregular public streams and the Unreal decoder.

A useful feasibility test should answer:

1. Can one historically troublesome feed run through the relay for an extended period without crashing?
2. Can the relay restart or switch sources without leaking processes/resources?
3. Can webcam audio remain disabled?
4. Can the existing random rotation logic and metadata remain unchanged above the relay layer?

Only after this small experiment succeeds should the architecture be expanded across the full catalog.

## 4. General lessons from these three failures

Three broader rules emerged from this pass:

### The same UI word can represent different sensor spaces

A single “Screen” button is fine, but the sensor target must follow the user's mental model of the current view. Presentation state is part of sensor routing.

### Realtime completion events are control-plane signals, not guaranteed media-plane completion

For lip sync, wait for audible output to drain and give the facial solver explicit settling frames.

### External live media should be normalized before it reaches a fragile realtime renderer

Large public webcam catalogs are heterogeneous by nature. Robustness belongs at the ingestion boundary, not in an ever-growing blacklist.

## 5. Current reference-build checkpoint

As of 2026-09-11:

- direct PCM lip sync has been changed to 512-sample / ~32 ms cadence with paced ~300 ms settling silence and the Electron build passes typecheck/build;
- the Wide View capture source bug has been identified and the main capture/watcher routing is patched, but voice-side semantics and final end-to-end testing are still pending;
- Wide View live webcams are functional but Electra decoder crashes remain an unresolved stability issue;
- forced WMF playback is a documented dead end for the tested public streams;
- a small local FFmpeg relay/remux experiment is the preferred next stability investigation.

Do not promote the Wide View visual-awareness repair or webcam stability work to PROVEN until a human has exercised the full lifecycle repeatedly.