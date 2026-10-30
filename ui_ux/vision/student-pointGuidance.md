# UX Vision & Design Specification: Point-Earning Guidance (راهنمای نوین)

## 1. Product & UX Vision

### Core Purpose
Transform the point-earning guide from an unstructured, vertical card feed into an organized, high-density, and goal-oriented directory. The design balances quick scanning with deep discoverability, enabling students to evaluate earning opportunities without losing their place in the interface.

### Design Pillars
* **Scan-First Architecture:** Broad categories collapse into compact accordions, presenting the complete activity landscape within a single viewport.
* **Progressive Disclosure:** Essential metadata (title and point range) is visible immediately in the table; granular prerequisites, guidelines, and context appear only on demand via modals.
* **Consistent Visual Identity:** Retains the high-contrast dark theme, neon-accented glowing card borders (cyan, bright green, and deep blue), and glassmorphic elevated panels.
* **Mobile-First Touch Ergonomics:** Category headers and table rows are sized for thumb-friendly tap targets, supporting single-handed navigation.

---

## 2. Information Architecture & Layout Structure

The screen follows a clear top-to-bottom hierarchy:

```
+------------------------------------------------+
| Top Bar (Profile Avatar, Level, Notifications) |
+------------------------------------------------+
| Hero Card (Owl Mascot, Welcome, Overview)      |
+------------------------------------------------+
| Section Header: "فعالیت‌های مؤثر برای کسب نوین"|
+------------------------------------------------+
| [Accordion 1: Educational Activities - OPEN]  |
|  - Table Header: [عنوان فعالیت] | [امتیاز]    |
|  - Row 1: Task Title ........... [ Point Tag ] |
|  - Row 2: Task Title ........... [ Point Tag ] |
|  - Row 3: Task Title ........... [ Point Tag ] |
+------------------------------------------------+
| [Accordion 2: Disciplinary Activities - CLOSED]|
+------------------------------------------------+
| [Accordion 3: Cultural & Sports - CLOSED]      |
+------------------------------------------------+
| Bottom Navigation Bar                          |
+------------------------------------------------+
```

---

## 3. Component Specifications

### A. Collapsible Category Groups (Accordions)
* **Visual Styling:** Elevated dark containers with 1px rounded border gradients and ambient neon halos (`bg-dark-card rounded-2xl border border-slate-800`).
* **Header Elements (Right-to-Left):**
  * **Leading/Right Title & Icon:** Bold category title (e.g. `فعالیت‌های آموزشی`, `فعالیت‌های انضباطی`) with semantic category badge and count pill.
  * **Trailing/Left Indicator:** Minimalist chevron icon (`ChevronDown` / `ChevronUp`) indicating toggle status, rotating 180° when open.
* **Interaction Behavior:**
  * Tapping anywhere along the accordion bar toggles expansion.
  * Smooth height transition (`max-height` ease-in-out, 250ms).
  * Multiple categories can be expanded simultaneously; the first category is expanded by default on initial page load.

---

### B. Activity Tables (Tabular Presentation)
* **Structure:** A compact two-column layout optimized for mobile screens without horizontal scrolling.
* **Columns:**
  1. **Right Column (`عنوان فعالیت` — Activity Title):** Primary text label describing the actionable behavior.
  2. **Left Column (`امتیاز پیشنهادی` — Suggested Points / Range):** Numeric badge or pill displaying localized Persian digits (e.g., `۵۰ نوین`, `۲۰ تا ۴۰ نوین`).
* **Row Interaction:**
  * **Touch Target:** Minimum 48px row height (`min-h-[48px]`).
  * **Feedback:** Subtle background luminance shift or border glow highlight on `:active` tap (`active:bg-neon-green/10`).
  * **Action:** Tapping any row opens the Activity Detail Modal.

---

### C. Activity Detail Modal (Overlaid Sheet)
* **Visual Treatment:** Center-anchored card or bottom sheet with heavy background backdrop-filter blur (`backdrop-blur: 12px; rgba(0,0,0,0.65)`). Neon green glowing boundary to signal active focus.
* **Content Hierarchy:**
  1. **Header:** Centered label `جزئیات فعالیت`.
  2. **Activity Name:** High-contrast, bold title (e.g., `شرکت فعال در مباحث درس`).
  3. **Point Badge:** Prominent glowing chip displaying the exact reward or range with Persian numerals.
  4. **Description Body:** Clear, student-facing expectations and submission criteria.
  5. **Call-to-Action:** Primary neon button (`متوجه شدم` / "Got it") dismisses the modal and returns focus directly to the opened table row.

---

## 4. Interaction & Motion Rules

| Event | UI Response | Duration / Easing |
| --- | --- | --- |
| **Tap Accordion** | Chevron rotates 180°; content panel animates height smoothly. | 250ms `cubic-bezier(0.4, 0, 0.2, 1)` |
| **Tap Table Row** | Row flashes a neon highlight glow; background dims into a blur. | 150ms ease-out |
| **Modal Appearance** | Modal slides up/fades in with backdrop blur. | 200ms ease-out |
| **Dismiss Modal** | Modal slides down/fades out; backdrop blur resolves cleanly. | 150ms ease-in |

---

## 5. Accessibility & Localization Constraints

* **RTL Layout:** Full support for `dir="rtl"`. Columns, chevron orientations, and badge alignments strictly follow Persian reading flow.
* **Persian Numerals:** All points and numeric bounds use Persian glyphs (`۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹`) across table badges and modal bodies.
* **Contrast Ratios:** Text colors adhere to WCAG AA guidelines against the dark theme (minimum 4.5:1 for body copy, 3:1 for large headers and badges).
* **Clear Dismissal Paths:** Modals close via the primary CTA button (`متوجه شدم`), by tapping anywhere on the darkened backdrop, or via the mobile back navigation command.

