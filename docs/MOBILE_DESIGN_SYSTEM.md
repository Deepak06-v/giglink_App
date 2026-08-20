# GigLink Mobile Design System

> **Status:** Permanent UI/UX context for all native mobile development.  
> **Scope:** Design specification only — no implementation in this document.  
> **Reference:** Approved Stitch design direction (layout, hierarchy, dark premium marketplace UX).  
> **Last established:** Phase 0.5 — Design Context

---

## 1. Product Context

**GigLink** is an on-demand micro-gig marketplace connecting **Workers** with **Employers**.

The mobile app must feel like a **real consumer marketplace** — not a college project, generic CRUD app, admin dashboard, or desktop site squeezed into mobile.

### Worker goals
Discover gigs · Search & filter · View details · Apply · Track applications · Manage assignments · Complete work · Profile · Notifications

### Employer goals
Create & manage jobs · Review applications · Accept/reject workers · Track assignments & activity · Profile · Notifications

---

## 2. Design Philosophy

### Core direction

```
CLEAN MARKETPLACE UX
+ DARK PREMIUM VISUAL DESIGN
+ MODERN CONSUMER APP
+ FAST UTILITY
```

**Premium because it is simple, intentional, and polished** — not because of gradients, glow, or excessive animation.

### Visual personality

| Should feel | Should NOT feel |
|-------------|-----------------|
| Modern, premium, confident | Corporate, cold |
| Trustworthy, fast, useful | Overly futuristic, gaming-like |
| Professional, approachable | Crypto-like, artificially luxurious |
| Local, human | Over-designed |

### Retention philosophy

Retention comes from **utility and clarity**, not addictive patterns:

- Useful job discovery and relevant sections
- Fast search and accessible filters
- Clear application progress and status
- Helpful notifications and fast actions
- Strong visual hierarchy and subtle, purposeful motion

The app should feel **alive without feeling noisy**.

| Role | Guiding question |
|------|------------------|
| Worker | *"Here are the gigs relevant to you."* |
| Employer | *"Here is what needs your attention."* |

### Implementation priority (when coding conflicts arise)

1. Usability  
2. Accessibility  
3. Consistency  
4. Performance  
5. Visual fidelity  

Do not sacrifice usability to reproduce a visual element.

---

## 3. Color Tokens

GigLink is **dark-first**. Use **layered dark surfaces** — never flat pure black everywhere.

### 3.1 Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `background.primary` | `#0B0B0F` | App root, screen base |
| `background.secondary` | `#111116` | Screen sections, alternate regions |
| `surface.card` | `#15151B` | Cards, list items, primary containers |
| `surface.elevated` | `#1B1B22` | Raised cards, search field, bottom nav |
| `surface.higher` | `#202027` | Modals, bottom sheets, popovers |
| `border.default` | `#27272A` | Card borders, dividers, input outlines |

### 3.2 Text

| Token | Hex | Usage |
|-------|-----|-------|
| `text.primary` | `#F5F5F7` | Headings, titles, primary content |
| `text.secondary` | `#A1A1AA` | Subtitles, metadata, supporting labels |
| `text.muted` | `#71717A` | Placeholders, disabled, tertiary info |

### 3.3 Brand accent

| Token | Hex | Usage |
|-------|-----|-------|
| `brand.primary` | `#3B82F6` | Primary buttons, active nav, links, focus, progress |
| `brand.primaryPressed` | `#2563EB` | Pressed/active primary states |

**Rule:** Blue is **selective**. It signals primary action, selection, and focus — not decoration on every element.

### 3.4 Semantic colors

| Token | Hex | Usage |
|-------|-----|-------|
| `semantic.success` | `#22C55E` | Accepted, completed, success feedback |
| `semantic.warning` | `#F59E0B` | Pending, attention needed |
| `semantic.error` | `#EF4444` | Rejected, errors, destructive actions |

**Semantic treatment:** Prefer **subtle tinted dark backgrounds** + readable status text — not giant saturated pills.

Example (Pending):
- Background: dark amber tint on `surface.card` (e.g. `rgba(245, 158, 11, 0.12)`)
- Text: `#F59E0B` or softened amber on `text.primary`

| Status | Background approach | Text |
|--------|---------------------|------|
| PENDING | Amber tint | Warning amber |
| ACCEPTED | Green tint | Success green |
| REJECTED | Red tint | Error red |
| WITHDRAWN | Neutral muted tint | `text.muted` |
| OPEN / ACTIVE | Blue tint (optional) | `brand.primary` |
| COMPLETED | Green tint (muted) | `text.secondary` |
| DRAFT | Neutral | `text.muted` |
| FILLED | Blue or neutral tint | `text.secondary` |

---

## 4. Typography

### Font family

Primary: **Inter** (cross-platform via Expo Google Fonts or equivalent).  
Fallback stack: `Inter`, `SF Pro Text`, `System`, sans-serif.

Alternates acceptable if Inter unavailable: Manrope, Plus Jakarta Sans.

### Principles
- Clean, modern, confident, highly readable
- Hierarchy through **size and spacing**, not excessive weights
- Limit weights: Regular (400), Medium (500), Semibold (600), Bold (700) — use Semibold as default emphasis

### Scale

| Token | Size | Weight | Line height | Usage |
|-------|------|--------|-------------|-------|
| `heading.xl` | 28px | Semibold/Bold | 34px | Screen titles, greetings |
| `heading.lg` | 20px | Semibold | 26px | Section headings |
| `heading.md` | 17px | Semibold | 22px | Card titles, job titles |
| `body.lg` | 15px | Regular | 22px | Primary body, descriptions |
| `body.md` | 14px | Regular | 20px | Standard body, metadata |
| `caption` | 12px | Regular/Medium | 16px | Timestamps, badges, hints |
| `label` | 13px | Medium | 18px | Form labels, filter chips |

### Examples

```
Good evening, Deepak          → heading.xl, text.primary
Find your next gig            → body.lg, text.secondary
Event Staff                   → heading.md, text.primary
ABC Events · Bangalore        → body.md, text.secondary
₹800                          → heading.md, text.primary (compensation emphasis)
```

---

## 5. Spacing

Base unit: **4px**. Use consistent multiples.

| Token | Value | Usage |
|-------|-------|-------|
| `space.xs` | 4px | Tight inline gaps, icon-to-text |
| `space.sm` | 8px | Chip padding, compact stacks |
| `space.md` | 12px | Card internal gaps, list item padding |
| `space.lg` | 16px | Screen horizontal padding, card padding |
| `space.xl` | 20px | Section gaps |
| `space.2xl` | 24px | Between major sections |
| `space.3xl` | 32px | Large section breaks, hero spacing |

### Screen layout
- Horizontal screen padding: **16px** (`space.lg`)
- Section vertical gap: **24px** (`space.2xl`)
- Card internal padding: **16px** (`space.lg`)
- Between cards in a list: **12px** (`space.md`)

**Balance:** Breathable but information-dense enough for a marketplace. Avoid cramped layouts and excessive empty space.

---

## 6. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | 10px | Buttons |
| `radius.md` | 12px | Inputs, search field |
| `radius.lg` | 16px | Cards (default: 16px; range 14–18px) |
| `radius.xl` | 20px | Bottom navigation bar |
| `radius.full` | 9999px | Status badges, filter pills only |

**Rules:**
- Pills: filters and status badges only
- Do NOT pill-shape every control
- Avoid toy-like over-rounding

---

## 7. Elevation & Depth

Depth is created through **surface color steps**, not heavy shadows.

| Level | Surface | Shadow (optional, subtle) |
|-------|---------|---------------------------|
| 0 | `background.primary` | None |
| 1 | `surface.card` | None or 1px border `border.default` |
| 2 | `surface.elevated` | `0 2px 8px rgba(0,0,0,0.24)` |
| 3 | `surface.higher` | `0 8px 24px rgba(0,0,0,0.32)` |

**Avoid:** Giant shadows, excessive borders, decorative depth.

---

## 8. Icons

- Style: Outlined or simple stroke icons (Lucide-style consistency)
- Size: 20px inline, 24px navigation, 16px metadata
- Color: `text.secondary` default; `brand.primary` when active; `text.muted` when disabled
- Use icons to support scanning — not as decoration

Common metaphors:
- Location: pin
- Time: clock
- Money: currency prefix (₹) in typography preferred over icon clutter
- Notifications: bell (header only)

---

## 9. Buttons

### Primary
- Background: `brand.primary`
- Pressed: `brand.primaryPressed`
- Text: `#FFFFFF`, Semibold, 15px
- Radius: `radius.sm` (10–12px)
- Height: **48px** minimum touch target
- Padding horizontal: 20px

### Secondary
- Background: transparent or `surface.elevated`
- Border: 1px `border.default`
- Text: `text.primary`

### Destructive (Reject)
- Background: transparent or subtle red tint
- Border or text: `semantic.error`
- Visually **weaker** than Accept

### Ghost / Text
- No background; `brand.primary` text for links ("View details →")

### FAB / Post Job (Employer)
- Primary blue, prominent
- Label: **"+ Post a Job"**
- Full-width or wide pill on dashboard — not hidden

### States
| State | Treatment |
|-------|-------------|
| Default | As above |
| Pressed | Darken 1 step, scale 0.98 (subtle) |
| Disabled | 40% opacity, no interaction |
| Loading | Spinner replaces label or inline left |

---

## 10. Inputs

### Search field (hero element on Worker Jobs)
- Background: `surface.elevated`
- Border: 1px `border.default` or none
- Radius: `radius.md` (12–14px)
- Height: **48–52px**
- Placeholder: `text.muted` — "Search jobs..."
- Icon: search left, optional clear right
- Large and elevated — search is central to Worker UX

### Text inputs (forms)
- Background: `surface.card`
- Border: 1px `border.default`
- Focus border: `brand.primary`
- Radius: `radius.md`
- Label above field: `label` token
- Error: `semantic.error` border + caption below

### Select / pickers
- Same visual as text input; chevron right
- Prefer bottom sheet for multi-option on mobile

---

## 11. Cards

Cards are a **core UI primitive**. They must feel premium, scannable, structured, tactile, and lightweight.

### Base card
```
background: surface.card (#15151B)
border: 1px border.default (#27272A)
border-radius: radius.lg (16px)
padding: space.lg (16px)
```

### Job card (Worker) — information priority

1. **Job title** — `heading.md`, `text.primary`
2. **Employer** — `body.md`, `text.secondary`
3. **Location** — `body.md`, `text.secondary` + pin icon
4. **Date / time** — `body.md`, `text.secondary` + clock icon
5. **Compensation** — `heading.md`, `text.primary` (₹ amount prominent)
6. **Status / capacity** — badge if applicable
7. **Action** — "View details →" link or chevron

**Avoid:** Huge images pushing content below the fold.

### Application card (Worker)
- Job title, employer, applied date, job date, status badge
- Status immediately scannable

### Assignment card (Worker)
- Upcoming/Active: full card treatment, primary CTA visible
- Completed: reduced emphasis — `text.secondary`, muted surface or no border

### Employer job card
- Title, status badge, application count, location, date/time
- Primary action: "Review Applications" or contextual CTA

### Applicant card (Employer)
- Worker name, job title, rating (if available), application date, status
- Actions row: **[ Reject ]** secondary/destructive · **[ Accept ]** primary

### Stat card (compact, Employer dashboard)
- Label: `caption`, `text.muted`
- Value: `heading.lg`, `text.primary`
- Background: `surface.card`
- 2×2 or horizontal scroll — **not** analytics-dashboard heavy

---

## 12. Status Badges

- Shape: pill (`radius.full`)
- Padding: 6px horizontal, 4px vertical
- Font: `caption`, Medium
- Use semantic tint background + semantic text (see §3.4)

Do not use full-brightness solid fills for large badges.

---

## 13. Filters

### Quick filters (horizontal scroll)
- Pill shape, `radius.full`
- Unselected: `surface.elevated`, `text.secondary`, border `border.default`
- Selected: subtle blue tint bg, `brand.primary` text, optional blue border
- Examples: `Today`, `Nearby`, `₹500+`, `Events`

### Advanced filters
- Access via "Filters" chip or icon — opens **bottom sheet**
- Do not show all advanced options on main screen permanently

### Employer job filters
`All` · `Open` · `In Progress` · `Completed` — same chip pattern

---

## 14. Header

### Standard screen header
- Background: `background.primary` or transparent on scroll
- Title: `heading.lg`, left-aligned or centered per screen
- Back: left chevron, `text.primary`
- Actions: right (notification bell, edit) — max 1–2 icons

### Notification access
- **Top-right bell icon** on applicable screens
- Badge: small blue dot or count on `brand.primary`
- **NOT** a bottom navigation tab

### Safe area
- Respect `safeAreaInsets` top and bottom on all screens

---

## 15. Bottom Navigation

### Container
- Background: `surface.elevated` or floating with `surface.higher`
- Radius: `radius.xl` (18–22px) if floating
- Border top: 1px `border.default` if edge-to-edge
- Height: ~56–64px + safe area bottom
- Shadow: subtle level 2

### Worker tabs
| Tab | Icon + Label |
|-----|--------------|
| Jobs | Briefcase / search |
| My Applications | Document |
| My Assignments | Clipboard / check |
| Profile | User |

### Employer tabs
| Tab | Icon + Label |
|-----|--------------|
| Dashboard | Grid / home |
| My Jobs | Briefcase |
| Applications | Users / inbox |
| Profile | Building / user |

### Active state
- Icon: `brand.primary`
- Label: `brand.primary`, Medium, 11–12px
- Optional: small dot or underline indicator

### Inactive state
- Icon + label: `text.muted`

**Rules:** Compact, one-handed, no duplicate nav inside profile screens.

---

## 16. Bottom Sheets

Use for:
- Advanced job filters
- Sort options
- Secondary confirmations (non-destructive)
- Multi-step picker fields

- Background: `surface.higher`
- Top handle: 36×4px, `border.default`, centered
- Radius top: 20px
- Backdrop: `rgba(0,0,0,0.6)`

---

## 17. Screen Patterns

### 17.1 Worker Home (Jobs tab)

**Answers:** *"What useful gigs can I find right now?"*

```
Greeting (time-aware)          heading.xl
Subtitle                       body.lg, secondary
[ Notification bell ]          header right

[ Search jobs... ]             elevated search

Quick filters (horizontal)     Today · Nearby · ₹500+ · Events

Section: Recommended for you   heading.lg

[ Job card ]
[ Job card ]
...

Bottom navigation
```

- **No** statistics overload on home
- Primary purpose: **find work**
- Room for personalized sections when backend data allows ("Recommended for you")

### 17.2 Worker Job Details

```
Job title
Employer (+ logo if available)
Status badge
Compensation (prominent)
Location
Date + time
Description
Requirements
Additional details

[ Sticky bottom: Apply Now ]    primary button, full width
```

- Apply CTA visually dominant
- Build confidence before applying

### 17.3 Worker Applications

**Answers:** *"What is happening with my applications?"*

List of application cards: job, employer, applied date, job date, status.

Statuses: `PENDING` · `ACCEPTED` · `REJECTED` · `WITHDRAWN`

### 17.4 Worker Assignments

Sections or tabs:
- **Upcoming / Active** — higher emphasis, action CTAs
- **Completed** — quieter visual treatment

### 17.5 Worker Profile

Personal, not administrative:
- Avatar, name, role badge
- Stats grid 2×2: Total Jobs · Applications · Assignments · Completed
- Profile fields
- Edit profile action
- **Not** a second dashboard

### 17.6 Employer Dashboard

**Answers:** *"What is happening with my jobs?"*

```
Greeting
[ Notification bell ]

Stat cards (compact 2×2 or row):
  Total Jobs · Applications · Active Jobs · Completed

[ + Post a Job ]               primary, prominent

Needs your attention           section
  [ Card: job + "7 applications waiting" + Review CTA ]

Recent Jobs                    section

Bottom navigation
```

- Useful urgency without aggressive colors
- Not an analytics platform

### 17.7 Employer My Jobs

- Filter chips: All · Open · In Progress · Completed
- Job cards with title, status, application count, location, datetime, action

### 17.8 Employer Applications

- Applicant cards with accept/reject
- Accept = primary; Reject = secondary destructive

### 17.9 Notifications (center)

- Accessed from header bell, not bottom nav
- Tabs or filter: **All** · **Unread**
- Unread: slightly brighter `surface.elevated` + dot indicator
- Read: muted `text.secondary` titles

Notification types (labels from backend):
Application received · Accepted · Rejected · Assignment · Job completed · Review · etc.

---

## 18. Empty States

- Illustration or simple icon (muted, not cartoonish)
- Title: `heading.md`, `text.primary`
- Message: `body.md`, `text.secondary`
- Single CTA when actionable (e.g. "Browse jobs", "Post a job")
- Centered vertically with comfortable padding

Examples:
| Screen | Message direction |
|--------|-------------------|
| No applications | "You haven't applied to any gigs yet." |
| No assignments | "No active assignments." |
| No notifications | "You're all caught up." |
| No jobs (employer) | "Post your first job to find workers." |

---

## 19. Loading States

- **Skeleton screens** preferred over spinners for lists and cards
- Skeleton: `surface.elevated` blocks with subtle pulse animation
- Match layout of real content (card shape, text lines)
- Pull-to-refresh: native pattern with `brand.primary` tint
- Button loading: inline spinner, disable interaction

**Avoid:** Full-screen blocking loaders except initial auth bootstrap.

---

## 20. Error States

- Inline card or banner on `surface.card` with subtle red tint
- Icon + message + **Retry** button (secondary)
- Form errors: field-level + summary if needed
- Toast/snackbar for transient errors (bottom, above nav)

Messages: human, actionable — not raw API strings.

---

## 21. Success Feedback

- Brief toast or inline confirmation
- Subtle check icon, `semantic.success`
- Do not block navigation with modal success unless critical

Examples: "Application submitted", "Profile updated", "Job posted"

---

## 22. Micro-interactions

| Interaction | Treatment |
|-------------|-------------|
| Card press | Opacity 0.92 or scale 0.99, fast (100–150ms) |
| Button press | Background darken, scale 0.98 |
| Filter select | Immediate chip state change |
| Nav switch | Cross-fade or subtle slide (200–250ms) |
| Sheet open | Slide up + backdrop fade |
| List refresh | Pull-to-refresh |

**Avoid:** Bouncing, particles, continuous animations, decorative transitions.

---

## 23. Mobile-First Constraints

### Target viewports
360×800 · 375×812 · 390×844 · 414×896

### Layout rules
- Single column only
- Minimum touch target: **44×44pt**
- Sticky bottom CTAs where appropriate (Apply, Accept/Reject)
- Horizontal scroll for filters and stat rows
- Bottom sheets over full-screen modals when possible
- Safe area on all edges

**Never** squeeze desktop layouts into mobile.

---

## 24. Personalization (design placeholders)

Where backend data supports it, reserve UI space for:
- "Recommended for you" job sections
- Recent searches (local, future)
- Application progress summaries
- Upcoming assignments highlight
- Employer "Needs attention" queue
- Notification summary on dashboard

**Do not** invent AI recommendations or algorithms in design implementation — layout room only.

---

## 25. Worker Design Principles

1. **Discovery first** — search and filters are heroes  
2. **Minimize friction to apply** — sticky Apply, clear eligibility  
3. **Status clarity** — always show what stage an application/assignment is in  
4. **Action-oriented assignments** — upcoming work stands out  
5. **Personal profile** — human identity, light stats  
6. **No dashboard clutter** — jobs home is not a stats wall  

---

## 26. Employer Design Principles

1. **Attention queue** — "Needs your attention" surfaces pending applications  
2. **Post Job is always findable** — primary CTA on dashboard  
3. **Compact stats** — orientation, not analytics  
4. **Application review is first-class** — accept/reject clear and fast  
5. **Job management at a glance** — status + application count on cards  
6. **Company identity** — profile reflects trustworthiness  

---

## 27. Consistency Checklist

Every new screen must use shared tokens for:

- [ ] Colors (§3)
- [ ] Typography (§4)
- [ ] Spacing (§5)
- [ ] Radius (§6)
- [ ] Elevation (§7)
- [ ] Buttons (§9)
- [ ] Inputs (§10)
- [ ] Cards (§11)
- [ ] Status badges (§12)
- [ ] Bottom navigation (§15)
- [ ] Header + notifications (§14)
- [ ] Empty / loading / error patterns (§18–20)

No one-off styling without documented UX justification.

---

## 28. Stitch Reference Notes

The approved Stitch designs are the **visual reference** for:

- Layout hierarchy and visual rhythm  
- Card composition and information density  
- Dark surface layering  
- CTA placement and navigation structure  
- Spacing and typography relationships  

**Adaptation rule:** Preserve visual identity while fitting real device dimensions, safe areas, and platform conventions (iOS/Android). Do not blindly copy pixels.

> **Note:** If Stitch exports specify exact values that differ slightly from tokens above, reconcile in favor of this document's token system unless a Stitch value is explicitly approved as an override.

---

## 29. What This Document Does NOT Cover

- API integration (see `MOBILE_API_CONTRACT.md`)
- Navigation implementation (Phase 1+)
- Component library code (Phase 1+)
- Animation library selection (Phase 1+)

---

## 30. Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-08-13 | Initial design system from approved Stitch direction |
