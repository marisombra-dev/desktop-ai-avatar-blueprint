# 10j - Native Google Workspace MCP with Bounded OAuth: 2026-09-16

**Status: BACKEND-VALIDATED SERVICE PATH; HUMAN OAUTH COMPLETED; ORDINARY SPOKEN WORKFLOW NOT YET HUMAN-ACCEPTED**

This chapter records how the reference desktop companion gained native Gmail, Google Calendar, and Google Drive access without turning browser automation into the primary Google interface and without creating a second AI personality.

The architectural rule is the same one used throughout this repository:

> **Keep one person. Add a bounded capability beneath that person.**

The existing OpenClaw person remains the decision owner. A local Google Workspace MCP server supplies authenticated service actions. Windows/UI automation remains available as a fallback for visual workflows, but ordinary Google data access no longer depends on clicking web pages.

Validated upstream component:

- `@dguido/google-workspace-mcp`
- reference-build pin: `3.3.0`
- upstream: https://github.com/dguido/google-workspace-mcp
- upstream license at validation time: MIT

Versions and dependency advisories change. Re-check current upstream releases before reproducing the pin.

---

## 1. Why native service access belongs beside, not inside, Windows-Use

Generalized Windows UI hands can operate Gmail, Calendar, and Drive through Chrome if the browser is already signed in. That is useful as a fallback, but it is not the best primary interface for structured service work.

Browser automation has weaker semantics for service tasks:

- search results are whatever the page currently renders;
- pagination and lazy loading become UI problems;
- a visually similar button can target the wrong object;
- page redesigns can break selectors;
- postcondition verification is harder;
- the browser session becomes an accidental credential boundary.

A native connector can instead ask the service directly for messages, events, or files and receive stable identifiers in return.

The preferred routing is therefore:

```text
user request
   -> existing Ethan/OpenClaw decision owner
      -> native Google Workspace MCP for structured Gmail/Calendar/Drive work
      -> deterministic browser/UI hands only when a visual web workflow is actually needed
```

This does **not** eliminate UI automation. It stops using pixels and accessibility controls where a structured authenticated API already exists.

---

## 2. ChatGPT connector authorization does not transfer automatically

The reference user had already authorized Gmail, Calendar, and Drive inside ChatGPT. That authorization did not make the same OAuth credentials available to the desktop OpenClaw runtime.

Treat connector authorization as belonging to the host/runtime that received it.

For a separate local desktop runtime, create a separate OAuth client and store its credentials privately.

Do not:

- copy a ChatGPT connector token out of ChatGPT;
- assume browser cookies are an API credential strategy;
- commit OAuth client secrets or refresh tokens;
- silently share one application's credential store with another application.

The reference build used a Google OAuth **Desktop app** client dedicated to the desktop companion.

---

## 3. Keep OAuth material outside the project and repository

The reference runtime keeps Google OAuth material in a user-private configuration directory, separate from both the public blueprint and the application source tree.

Conceptual layout:

```text
private user config/
  google-workspace-mcp/
    credentials.json   # OAuth desktop client
    tokens.json        # access/refresh tokens

application runtime/
  google-workspace-mcp-runtime/
    policy proxy
    pinned package
    setup/auth helper
```

The public repository should document the pattern, never the user's actual credential JSON, account address, client id, client secret, access token, or refresh token.

---
## 4. OAuth consent and API enablement are separate gates

This integration hit two different Google controls that can look like the same authorization failure.

First, a Google OAuth app in **Testing** mode rejected authorization because the intended account had not actually been saved in the app's test-user list. Adding the test account fixed that gate.

Second, after OAuth completed successfully, Gmail worked while Calendar and Drive returned HTTP 403 errors. Their APIs had not yet been enabled in the Google Cloud project.

The required setup sequence is therefore:

```text
create/select dedicated Google Cloud project
-> configure OAuth consent / audience
-> add intended test user if app remains in Testing
-> create Desktop-app OAuth client
-> enable Gmail API
-> enable Google Calendar API
-> enable Google Drive API
-> run local OAuth authorization
-> validate each service independently
```

OAuth scopes answer **what the token may request**. API enablement answers **whether this Cloud project may call that service at all**. You need both.

### Testing mode is not a durable daily-use state

Google currently documents that authorizations and refresh tokens issued while an external OAuth app remains in **Testing** expire after seven days when non-basic scopes are requested. For a daily desktop companion, move the app to **In production** and reauthorize before treating the connector as durable. Publishing status and Google verification are separate concepts; an unverified-app warning or verification requirements may still apply.

The first successful reference-build token was issued while the app was still in Testing, so this production-publishing/reauthorization step remains a durability gate until completed.

Current Google audience/publishing documentation: https://support.google.com/cloud/answer/15549945

---

## 5. Minimize upstream OAuth scopes before asking the human to consent

The validated package version's default non-read-only service map requested broader scopes than the reference companion needed, including full Gmail mailbox access and Gmail settings access.

The reference build reduced the requested service scopes to the minimum set needed for the intended write-capable connector:

```text
Drive:    drive
Gmail:    gmail.modify
Calendar: calendar
```

This was narrower than the upstream defaults but is **not read-only**. The local tool policy is therefore still essential.

Important distinction:

> OAuth scope is the outer service permission envelope. The MCP policy proxy is the application's actual day-to-day capability surface.

If a future build only needs reading, prefer the package's read-only mode and read-only Google scopes instead of asking for write-capable scopes.

Do not ask for a broad permission merely because an upstream package happens to include it by default.

---

## 6. Put a policy proxy between the AI and the third-party MCP server

The reference build does not expose the upstream server's complete tool registry directly to Ethan.

A local proxy whitelists the intended tools and adds explicit policy checks. OpenClaw independently applies the same tool include-list, giving two layers of allowlisting.

At the validated checkpoint, the filtered surface contained **36 tools** across Gmail, Calendar, and Drive.

Intentionally excluded capabilities included:

- direct email send;
- email deletion;
- empty trash;
- calendar deletion;
- Drive deletion / empty-trash;
- permission removal;
- broad sharing/permission mutation;
- bulk destructive operations.

Additional bounded rules included:

- Gmail label mutation cannot route messages to Trash or Spam through the generic modify tool;
- bulk Gmail modification is capped;
- Calendar create/update defaults to not notifying attendees unless explicitly requested;
- tool annotations distinguish read-only operations from writes where possible.

A token may technically be capable of more than the exposed tools. The local application should still make unavailable actions literally absent from the model's tool surface.

---

## 7. A third-party MCP server can have a correct API call and an incorrect MCP contract

The first post-OAuth probe uncovered an interoperability bug unrelated to Google credentials.

The upstream server advertised `outputSchema` metadata for tools that returned ordinary MCP `content` instead of `structuredContent`.
A current MCP SDK correctly treats that as a contract violation and rejected otherwise valid tool responses with an error equivalent to:

```text
Tool <name> has an output schema but did not return structured content
```

The compatibility shim fixed the boundary by removing the broken output-schema metadata from the upstream tool metadata cached by the proxy before calls are made, while preserving each tool's input schema.

Conceptually:

```text
connect to upstream MCP
-> list tools
-> keep input schemas
-> discard incompatible outputSchema declarations
-> cache sanitized upstream metadata
-> expose separately filtered tools to OpenClaw
-> forward calls and ordinary MCP content
```

Do not "fix" this by disabling all response validation globally. Repair the smallest incompatible boundary.

This compatibility behavior is version-specific. Remove the shim if a future upstream release returns valid `structuredContent` or no longer advertises those schemas.

---

## 8. Human keyboard ownership is a hard safety invariant

During Google Cloud setup, one automation route used global synthetic keyboard input. A modifier key remained logically held after an interrupted action, temporarily preventing the human from using the keyboard normally.

That is unacceptable for a desktop companion.

The reference hands bridge was hardened so synthetic typing and shortcut actions release all common modifier keys both before the operation and in a `finally` cleanup afterward:

```text
Shift / left Shift / right Shift
Ctrl / left Ctrl / right Ctrl
Alt / left Alt / right Alt
left Windows / right Windows
```

The broader operating rule is stronger than that cleanup:

> **Automation must never require the human to surrender their keyboard or mouse.**

Prefer, in order:

1. direct background API/file operations;
2. semantic accessibility actions;
3. browser-native or DOM-level interaction;
4. mouse-only UI interaction when safe;
5. global synthetic keystrokes only when unavoidable and explicitly guarded.

If global keys are used, always release modifiers on success, error, cancellation, timeout, and process exit.

---

## 9. Validation evidence from the reference build

The connector was validated in layers rather than by assuming that a successful OAuth page meant the services worked.

### A. OAuth completion

The human completed Google's consent flow and the local callback reported successful token storage.
### B. Gmail native read/search

A live MCP call searched Gmail through the authenticated API and returned real results. No Gmail web page or browser scraping was involved.

### C. Calendar native read

After the Calendar API was enabled in the Google Cloud project, a live MCP call returned the account's calendar list successfully.

### D. Drive native read

After the Drive API was enabled, a live MCP call listed real Drive root contents successfully.

### E. OpenClaw visibility

OpenClaw configuration validation passed, the MCP runtime cache was reloaded without restarting the desktop companion, and `openclaw mcp probe` reported the `google-workspace` server with **36 tools**.

This proves the authenticated backend path and OpenClaw tool registration.

It does **not** yet upgrade every Google mutation or every natural-language voice workflow to human-accepted status. Drafting, event creation/update, Drive mutations, and conversational routing should each receive their own harmless acceptance checks before being described as human-proven.

---

## 10. Recommended reproduction sequence

Use this order:

```text
1. inventory existing Google/browser access
2. choose native service access rather than page automation for structured tasks
3. install/pin a Google Workspace MCP runtime separately
4. expose only intended services (Gmail/Calendar/Drive in the reference build)
5. put a local policy proxy in front of upstream tools
6. add an independent OpenClaw include-list
7. minimize OAuth scopes before first consent
8. create a dedicated Google Cloud OAuth Desktop client
9. keep credentials/tokens outside the repo
10. configure the OAuth audience/test user
11. enable each required Google API
12. complete consent
13. test one read call per service
14. validate OpenClaw sees only the intended tool surface
15. human-test harmless natural-language workflows
16. add higher-risk mutations only as explicit capability families
```

---

## 11. Dependency and update hygiene

The reference build evaluated a newer published package version but found a moderate dependency advisory in its installed tree. The validated runtime therefore pinned `3.3.0`, whose installed dependency audit was clean at the time of validation.

That does not make `3.3.0` permanently preferable. On a future installation:

- inspect the current upstream release;
- run the package-manager security audit;
- review upstream tool/scope changes;
- retest the output-schema compatibility behavior;
- re-check the tool allowlist before upgrading.

A dependency update can change permissions and tool surface even when your own code does not change.

---

## 12. Rules worth carrying forward

1. Authenticated service connectors belong beneath the existing person, not beside them as another agent.
2. Host-app OAuth credentials do not automatically belong to another runtime.
3. Prefer structured service APIs over visual browser automation for structured service tasks.
4. Keep OAuth credentials and refresh tokens out of source control.
5. Minimize requested OAuth scopes before asking the human to consent.
6. Treat Google API enablement and OAuth authorization as separate gates.
7. Put a policy proxy between a general third-party MCP and the conversational model.
8. Apply a second include-list at the agent host when practical.
9. Make dangerous tools absent, not merely discouraged by prompt text.
10. Test one real read call per service after OAuth.
11. Repair version-specific MCP contract mismatches at the narrowest boundary.
12. Never let automation take exclusive practical ownership of the human's keyboard or mouse.
13. Human acceptance should distinguish read/search proof from untested mutations.
14. Re-audit scopes, tools, dependencies, and schema behavior on every upstream upgrade.

The central lesson is:

> **A service connector should make the same person more capable, not make the trust boundary fuzzier.**

This chapter extends the computer-control and tool-policy work in `docs/10h-generalized-windows-ui-hands-without-a-second-agent-validated-2026-09-16.md` and the failure ledger in `docs/13-what-we-tried-and-what-failed.md`.
