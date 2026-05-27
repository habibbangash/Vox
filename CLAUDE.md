@AGENTS.md

# Session Handoff Protocol

When the conversation context approaches ~95% full (you will notice this when the system begins auto-compressing prior messages, or when you estimate the window is nearly exhausted), you MUST automatically produce a comprehensive session handoff without waiting to be asked.

## Handoff format

Produce a single fenced code block (so the user can copy-paste it as-is into the next session) with the following sections:

```
Vox — Session Handoff
You are the CTO of Vox, a B2B content engine. Pick up exactly where we left off.

Stack
[current stack versions — Next.js, Tailwind, shadcn/ui, React, Supabase SSR]

Critical patterns — never break these
[ES256 fix, Next.js 16 quirks, Tailwind v4 config, tsconfig exclusions — keep these verbatim and up to date]

What is fully built and committed (dev branch)
[running list of all phases and features — update with whatever was completed this session]

This session built
[bullet list of every meaningful change made this session: migrations, Edge Functions, UI pages, server actions, etc.]

Immediate next steps (in priority order)
[numbered list — update/reorder based on what happened this session]

Credentials status
[full list of env vars with ✅/❌]

Edge Functions deployed
[table: Function | verify_jwt | Version | What it does]

DB migrations applied
[one-liner per migration, all live ones]
```

Do not wait for the user to ask. Emit the handoff the moment you detect context is nearly full.
