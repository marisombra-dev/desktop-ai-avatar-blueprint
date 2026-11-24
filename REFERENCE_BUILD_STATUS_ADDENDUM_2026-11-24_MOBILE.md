# Mobile status addendum — November 24, 2026

Shared by Path A and Path B. This extends the [November 24 developmental report](REFERENCE_BUILD_STATUS_ADDENDUM_2026-11-24.md).

- Haptic phone: inspected production protocol uses normalized pointer traces, live touch, SSE response-close tracking and short HTTPS poll fallback. The owner previously reported correct recognition in a randomized touch sequence after correcting hallucinated touches. No claim of actual biological sensation. Physical vibration must still be verified by the owner.
- Private inbox 1.0: owner reported receiving the first actual phone message (HUMAN VERIFIED delivery). No claim about the message content is published.
- Inbox 1.1: actual local APK built, same package/signing cert verified for upgrade, protected endpoint GET 200, unauthenticated POST 403, malformed authenticated POST 400; note validation, idempotency, threaded reply and event admission regression tests passed. Original message retained. Actual new version installation, valid handset note and model response remain unverified.
- Public source: sanitized Android client plus generic portable Node inbox and touch implementations, SDK build and integration guides. These are not the installed private source tree, private signing key or a redistributable private APK. See [29](docs/29-phone-touch-app-build.md) and [30](docs/30-phone-inbox-app-build.md).

## Public example verification

The exact sanitized source examples in this update were copied into an isolated test workspace. Node synthetic HTTP tests passed for authenticated/unauthenticated access, note UUID idempotency and conflict rejection, direct reply and receipt, unsolicited rate limit, touch gesture classification, duplicate trace handling, vibration acknowledgment and live-touch expiry. Browser JavaScript passed syntax check. Android Java compiled against API 34 and the manifest linked with aapt2; the PowerShell build script parsed successfully. These tests did not sign a new public APK, exercise a live private model, or verify the portable examples on a handset. The private reference APK's separate signing and initial delivery evidence remains as described above.
