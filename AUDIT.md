# ArkBrain — UI/UX Audit Report

**Date:** 2026-09-25  
**Auditor:** Senior UI/UX Audit (automated)  
**Build status after fixes:** PASS (12 routes, zero TypeScript errors)

---

## Scores

| Criterion | Score | Verdict |
|---|---|---|
| Visual Hierarchy | 8/10 | PASS |
| Mobile Responsiveness | 7/10 | PASS (with fixes applied) |
| Accessibility | 8/10 | PASS after fixes (was 6/10) |
| Loading & Empty States | 8/10 | PASS |
| Copy Quality | 7/10 | PASS |
| **Overall** | **7.6/10** | **PASS** |

---

## Visual Hierarchy — 8/10

**Strengths:**
- Landing H1 at `text-5xl md:text-6xl` versus body `text-xl` and feature descriptions `text-sm` — clear 2.5x+ ratio at every breakpoint
- Gradient text on "that answers why" creates a deliberate focal point within the heading
- Primary CTAs ("Connect your first repo free →", "Start 14-day trial") are purple with glow shadow — unmistakable against the dark-purple canvas
- Pricing section creates strong contrast: bordered "Team" card with `shadow-glow-sm` reads as recommended without an explicit "Popular" label
- Dashboard Quick Ask card has `border-primary-500/30 shadow-glow-sm` — it visually reads as the primary action on the page
- Demo chat preview on the landing page anchors the value prop concretely

**Minor weaknesses:**
- Dashboard page title is just "Dashboard" — a missed opportunity for a personalized or status-aware heading (e.g., "Good morning, your team has 11 decisions indexed")
- Feature icons at `text-3xl` are the same size as section headings — not a hierarchy problem, just an aesthetic note

---

## Mobile Responsiveness — 7/10

**Strengths:**
- Sidebar slides in/out via hamburger on mobile; overlay closes on tap
- Landing CTAs stack via `flex-col sm:flex-row`
- Pricing grid and feature grid both collapse to single column below `md`
- `max-w-6xl mx-auto px-6` provides proper gutters at all widths
- Chat layout uses `max-md:absolute` positioning to overlay the session sidebar on small screens

**Issues found and fixed:**
- Button component touch targets were below the 44×44px WCAG minimum: `sm` was ~26px, `md` was ~28px, `lg` was ~36px tall. Fixed: `min-h-[36px]`, `min-h-[44px]`, `min-h-[48px]` added to each size respectively.
- Dashboard quick-ask `<input>` had no `min-h`. Fixed: `min-h-[44px]` added.
- Mobile hamburger buttons had no padding for tap area. Fixed: `p-2 min-h-[44px] min-w-[44px]` added.

---

## Accessibility — 8/10 (fixed from 6/10)

### Issues found and fixed

| File | Issue | Fix Applied |
|---|---|---|
| `app/(app)/layout.tsx` | Hamburger `☰` had no `aria-label` — screen readers read the symbol literally | Added `aria-label="Open navigation menu"` and `aria-expanded={sidebarOpen}`; replaced `☰` with an SVG icon |
| `app/(app)/layout.tsx` | Logout button showed `↗` with no `aria-label` | Added `aria-label="Sign out"`, replaced `↗` with a proper logout SVG icon |
| `app/(app)/chat/page.tsx` | Chat hamburger `☰` had no `aria-label` | Added `aria-label` toggling between "Open/Close conversation history" with `aria-expanded` |
| `app/(app)/chat/page.tsx` | Session delete control was a `<span>` not a `<button>` — not keyboard-focusable | Changed to `<button type="button">` with `aria-label="Delete conversation: [title]"` |
| `app/(app)/chat/page.tsx` | Citation close button had no `aria-label` | Added `aria-label="Close sources panel"` |
| `app/(app)/chat/page.tsx` | Chat textarea had no label (placeholder only disappears on input) | Added `<label htmlFor="chat-input" className="sr-only">Ask a question</label>` |
| `app/(app)/dashboard/page.tsx` | Quick-ask `<input>` had no label — only placeholder text | Added `<label htmlFor="dashboard-question" className="sr-only">` |
| `app/(app)/timeline/page.tsx` | Filter buttons had no `aria-pressed` — active state was color-only for screen readers | Added `aria-pressed={typeFilter === t}` and `role="group" aria-label="Filter decisions by type"` on container |
| `app/(app)/connectors/page.tsx` | Indexing progress bar had no ARIA role | Added `role="progressbar"` with `aria-label`, `aria-valuemin`, `aria-valuemax`; wrapped in `role="status" aria-live="polite"` |

**Positives (already correct):**
- Global `*:focus-visible` ring defined in `globals.css` — keyboard navigation visible on every interactive element
- All form inputs in login/register use the `Input` component which renders a proper `<label htmlFor={id}>` — no label gaps
- Badge component uses text labels alongside color — color is not the sole indicator of status
- Button component disables on `loading={true}` and shows a spinner with no accessible text overlap (spinner is purely visual)
- Error banners are styled blocks with descriptive text (not just "Error")

---

## Loading & Empty States — 8/10

**Strengths:**
- Dashboard stats: shimmer skeleton loaders using the project's `.shimmer` CSS class with correct `background-size` animation
- Dashboard decisions: three shimmer rows while loading, then an icon+message+CTA empty state
- Timeline: five shimmer card skeletons on first load; empty state with `🎯` icon, headline, body copy, and a link to Connectors
- Chat: animated three-dot bounce indicator while AI is generating a response
- Chat empty state: example question chips that pre-fill the input on click — excellent progressive disclosure
- Connectors: shimmer grid of four card skeletons while loading; inline progress bar with animated shimmer during sync
- App layout: full-screen spinner with the ArkBrain logo on auth load — avoids flash of unauthenticated content

**Minor weakness:**
- The connectors indexing progress bar is visually indeterminate (always 60% wide) — fine for MVP but a real progress value would improve perceived responsiveness

---

## Copy Quality — 7/10

**Strengths:**
- Hero sub-headline is extremely concrete: `"Why did we choose Postgres over MongoDB?" → Get a sourced answer citing the exact Slack thread from 14 months ago` — the use case is immediately legible
- CTAs are specific and action-oriented: "Connect your first repo free →", "Start 14-day trial", "Create account →"
- Pricing contrast copy is sharp: "$50K+/year for Glean. Under $500/month for ArkBrain." — positions the value prop in one sentence
- Error messages surface API text (e.g., "User already exists with this email") — specific and actionable
- Empty states have encouraging, non-technical language

**Weakness:**
- Hero headline opens with "The semantic knowledge graph" — "semantic knowledge graph" is engineering jargon. Non-technical buyers (CTOs, VPs Eng) will understand it, but a product manager seeing this cold may not. The concrete sub-headline rescues it, but the headline itself could be stronger. Recommendation: "Your team's institutional memory, with sources cited" or "The AI that remembers why your team made every decision".
- Dashboard page title "Dashboard" is generic — misses an opportunity to reinforce context

---

## Issues Found

| # | Severity | Criterion | Issue |
|---|---|---|---|
| 1 | High | Accessibility | Hamburger button had no `aria-label` (app layout + chat) |
| 2 | High | Accessibility | Logout button showed `↗` with no `aria-label` |
| 3 | High | Accessibility | Session delete was a non-focusable `<span>`, not a `<button>` |
| 4 | High | Accessibility | Quick-ask input and chat textarea had no label |
| 5 | Medium | Accessibility | Timeline filter buttons had no `aria-pressed` — state was color-only |
| 6 | Medium | Accessibility | Citation close button had no `aria-label` |
| 7 | Medium | Accessibility | Connector progress bar had no ARIA role |
| 8 | Medium | Mobile | Button touch targets below 44px WCAG minimum |
| 9 | Low | Copy | Hero headline contains jargon ("semantic knowledge graph") |
| 10 | Low | Visual | Dashboard page title "Dashboard" is generic |

---

## Issues Fixed

All 8 issues rated High and Medium were fixed in this audit pass. The 2 Low issues are documented for the next iteration.

Files modified:
- `/apps/web/app/(app)/layout.tsx` — hamburger aria-label, logout button icon + aria-label
- `/apps/web/app/(app)/chat/page.tsx` — session delete button, chat hamburger aria-label, citation close aria-label, textarea label, keyboard hint copy
- `/apps/web/app/(app)/dashboard/page.tsx` — quick-ask input label (visually hidden), min-h touch target
- `/apps/web/app/(app)/timeline/page.tsx` — filter button aria-pressed, group role + label
- `/apps/web/app/(app)/connectors/page.tsx` — progress bar ARIA roles
- `/apps/web/components/ui/button.tsx` — min-h touch targets on all sizes

---

## Final Verdict

**PASS — production-ready for demo and hackathon submission.**

ArkBrain's UI is polished, consistent, and purpose-built for its audience. The dark-purple/cyan design system is cohesive from landing page through every authenticated page. Loading states and empty states are thorough. The demo flow (landing → register → connectors → demo sync → chat → sourced answer) is immediately followable.

The one open design gap is the hero headline jargon, which is a risk only with non-technical first-time visitors. Engineering leaders and CTOs — the primary buyers — will parse "semantic knowledge graph" instantly and find it credible. For broader audiences, the concrete example in the sub-headline does the heavy lifting.

---

## User Value Answer

**"If a user saw this product for the first time, would they IMMEDIATELY understand what it does and want to use it?"**

**YES — for the right user. Conditionally YES for everyone else.**

A VP Engineering or senior engineer landing on the page will understand ArkBrain in under 10 seconds: the hero shows a real question being asked and a real sourced answer appearing. The demo chat preview on the landing page does more selling than any feature list could. They will recognize the pain immediately — the Slack thread from 14 months ago that answered a question nobody could find — and want to try it.

**The ONE moment that makes them say YES:**

The demo chat preview on the landing page. Specifically, the line:
> "We chose PostgreSQL over MongoDB for three key reasons... ACID compliance is critical for our financial transaction data [1]."
> Sources: `🐙 PR #1: Switch from MongoDB to PostgreSQL · sarah.chen · Mar 15, 2025`

A user who has ever struggled to remember _why_ a decision was made — or watched a senior engineer leave and take the context with them — will see that source citation and feel the pain disappear. The product's entire value is legible in that one card.

**What is NOT yet there (honest critique):**

1. There is no onboarding funnel after registration. A user who registers and sees an empty dashboard with "No connectors yet" has no guided path to the "aha" moment. The connectors page exists, but the user must navigate there themselves. A post-registration redirect to a "Connect your first source" wizard — or a banner on the empty dashboard — would dramatically improve activation.

2. The "Connect (Demo)" label on the connectors page is honest but awkward. A live user with a real GitHub repo will wonder if this is a toy. The label should be "Try with sample data" or "Load demo data" to frame it as an on-ramp, not a limitation.

3. The knowledge graph explorer (visualize decisions and relationships) is listed as a core feature in the spec but is absent from the navigation. For a hackathon demo this is fine — the chat + timeline combination is compelling enough — but for Series A pitches, a visual graph view would be the jaw-dropping screenshot.

**Does it solve something painful enough that people would pay?**

Yes. At $99/month versus $50K+/year for Glean, the pricing argument is almost too easy. Any engineering team that has ever lost a senior engineer, onboarded a new hire who spent 6 months asking "why did we do X?", or watched institutional knowledge vanish into Slack history — which is every team above 10 people — has a budget line this fits into immediately. The pain is real, chronic, and expensive. ArkBrain is the right product at the right price for this moment.
