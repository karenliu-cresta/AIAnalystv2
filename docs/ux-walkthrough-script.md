# AI Analyst v2 — UX Layout Walkthrough (talking points)

Order of what to point out and cover. Behavioral, not pixel-exact — the prototype is the source of truth.

---

### 1. Intro
- Frame the goal: unblock frontend on layout.
- Call out the four areas: landing→chat transition, chat/artifact split, responsiveness, history panel.
- Note: build to what's in the prototype.
- Out of scope: the chat's chain-of-thought (CoT) — not covered here.

### 2. Landing → chat transition
- Empty state = one centered stage (welcome header + composer), no chat column yet.
- Suggested prompts: category chips below the composer, each surfacing a list of starter prompts; hovering previews the rewritten ("well-written") version in the composer, clicking uses it. They disappear once a conversation starts.
- First message sent → layout re-roles: same area becomes a left chat column with its own header (session title, artifacts dropdown, action buttons); composer drops to the bottom.
- Takeaway: empty vs. active is one view switching modes, not two screens.

### 3. Chat + artifact panel model
- Artifact (report/chart) opens in a right-hand panel; chat retreats left; ~50/50 split with a panel minimum width.
- Hide/show-chat toggle: collapse chat → artifact fills the window.
- The toggle physically moves — "show chat" lives in the artifact header when chat is hidden; "hide chat" in the chat header when visible.
- Closing the artifact returns to full-width chat.
- All header action buttons share one consistent style (size + pill shape) → reusable action-button primitive.

### 4. Responsiveness
- Width-driven and per-panel, not global breakpoints — each column reacts to its own width.
- Chat column narrows → session title folds away (driven by column width, not by artifact open/close).
- Artifact panel narrows → action buttons drop labels, become icon-only.
- Report content centers naturally — left-aligned until the panel is wide enough that right padding would exceed left, then eases to center (continuous, not a hard snap).
- Takeaway: observe each panel's width independently; prefer continuous responses.

### 5. History panel
- Right-side overlay drawer with dimmed backdrop — slides over the view, doesn't push layout.
- Contains: search, filter by artifact type, sessions grouped by recency (Today, Last 7 days, …).
- Each row shows an artifact indicator (single badge, or stacked icon with a count for multiple).
- Selecting a row loads that session and closes the drawer.

### 6. Close
- Recap: one view that re-roles landing→chat; chat/artifact split with a traveling toggle; per-panel width responsiveness; history as overlay drawer.
- Prototype is the reference — flag ambiguities.
