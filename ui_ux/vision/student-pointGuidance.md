# UX Vision

This document analyzes the visual design and user experience intent of the provided point guidance page reference for a Student Reward System, tailored for a mobile web application in Persian.

## 1. Reference Context

* **OBSERVATION:** The reference context defines a Persian-language (RTL) mobile web view titled "راهنمای نوین" (Novin Guidance) under the domain `schoolscore.parswebapp.ir`, styled to match the application's dark-mode gamified visual identity. It features an introductory dark hero welcome card with a glowing neon perimeter border and the 3D blue bird mascot, personalized for student "نرگس مرادی", followed by a continuous vertical stack of neon-bordered dark cards detailing point-earning school activities.
* **DESIGN INTENT:** This screen functions as the student-facing, display-only **Point Earning Guidance** ("راهنمای نوین") view within the **Student Reward System**. Its purpose is to transparently present all current ways students can earn "نوین" (the system's currency/point unit) through positive academic, behavioral, and competitive actions.
* **INFERENCE:** Because teachers award points at their discretion rather than students claiming or submitting tasks directly from this screen, the interface serves as an inspirational reference guide and behavioral rubric.

## 2. Platform & Device

* **OBSERVATION:**
  * Mobile web application rendered within a mobile browser viewport, including browser header chrome at the top and browser navigation controls at the base.
  * Single-column portrait orientation.
* **DESIGN INTENT:**
  * Specifically optimized for **one-handed mobile usage**.
  * Core navigation elements are concentrated at the bottom of the viewport within thumb reach, sitting above the native browser bar.
* **INFERENCE:** As a mobile web interface, the layout must account for dynamic browser toolbars expanding and collapsing during vertical scrolling.

## 3. Overall Design Direction

* **OBSERVATION:** Built on a deep obsidian/midnight dark canvas (`#0B0E14` / `#0D1117`) accented by vibrant neon glowing borders and energetic gamified highlights (`#64DD17` neon lime green, `#FF3D00` coral-red, `#00E5FF` electric cyan, and `#FFD600` gold). Cards utilize dark matte charcoal surfaces (`#131822` / `#161C28`) with rounded corners, subtle inner ambient lighting, 3D-styled glossy/neon semantic icon badges (3D gold trophy, glowing green shield/flag, electric blue academic badge, glowing gold star), and the signature 3D blue bird mascot wearing a white cap.
* **DESIGN INTENT:** A friendly, high-energy gamified educational aesthetic localized completely in Persian (فارسی). All typography, numerical values, and layouts strictly adhere to Right-to-Left (RTL) standards and use "نوین" exclusively for points.
* **INFERENCE:** The contrast between the vibrant neon-bordered hero card (featuring the 3D mascot) and the color-coded neon-outlined activity cards organizes the page into distinct zones: high-level motivational orientation at the top, followed by scannable reference material below.

## 4. Layout & Spatial Structure

* **OBSERVATION:** The screen follows a strict top-to-bottom vertical structure:
  1. **Top Header:** Centered screen title ("راهنمای نوین") framed on a dark header surface (`#0B0E14`) with crisp white typography and subtle dark-glass icon buttons/borders.
  2. **Hero Banner:** Full-width dark container (`#131822`) with rounded corners (~20–24px), glowing neon coral-red or lime-green perimeter border, crisp white and neon-accented text, subtle dark pill sub-containers, and the 3D blue bird mascot illustration with an energetic aura.
  3. **Section Header:** Right-aligned category label ("فعالیت‌های مؤثر برای کسب نوین") in crisp white typography (`#FFFFFF`).
  4. **Card Stream:** Single-column vertical list of full-width dark guidance cards with glowing semantic neon borders and uniform margins and spacing (~12–16px gap). The third card is cut off by the viewport edge, establishing vertical scrollability.
  5. **Global Navigation Bar:** Fixed 5-tab dark dock bar anchored at the base of the app viewport, enclosed in a glowing neon-green rounded border with a raised central hexagonal trophy emblem.
* **DESIGN INTENT:** Deliver an unencumbered vertical scroll flow. The user navigates through cards using simple vertical thumb movement without horizontal carousels or nested scroll containers.

## 5. Navigation

* **OBSERVATION:**
  * Persistent 5-destination bottom tab bar housed in a rounded dark dock (`#121722`) with a glowing neon lime-green border (`#64DD17`), arranged in RTL sequence (right to left):
    1. **جوایز** (Awards) — Solid/styled gift box icon.
    2. **راهنمای نوین** (Point Earning Guidance) — Open book icon and label illuminated in active neon lime-green (`#64DD17` / `#76FF03`) with a subtle neon glow (Active State).
    3. **رتبه‌بندی و پروفایل** (Profile / Dashboard / Ranking) — Featured central raised hexagonal container with a neon green border, 3D gold trophy icon, and a solid neon-green pill label ("رتبه‌بندی و پروفایل") overlapping the bottom edge.
    4. **چالش‌ها** (Challenges) — Waving flag icon.
    5. **پیشنهاد فعالیت** (Student Task Proposals) — Paper airplane icon.
  * The active tab is differentiated by vibrant neon green illumination and crisp highlight text; inactive standard tabs use muted slate-gray icons (`#5C6B73`) and soft light-gray labels (`#B0B8C4`).
* **DESIGN INTENT:** The 5 core sections of the application are directly accessible at all times via thumb taps at the bottom of the screen.
* **INFERENCE:** For smaller viewports (e.g., 360px wide), the 5th tab title aligns cleanly with the specification ("پیشنهاد فعالیت") using compact typography (`10px–11px`) inside the neon-bordered bottom dock to prevent awkward line breaks.

## 6. Information Hierarchy

* **OBSERVATION:**
  * **Primary Information:**
    * Hero card greeting and purpose question ("چطور نوین بگیری؟") rendered in high-contrast white (`#FFFFFF`) alongside the 3D blue bird mascot.
    * Card Activity Title (bold, high-contrast white text `#FFFFFF`, top-right of card).
    * Suggested Point Allocation (bold neon-accented or glowing pill text at the card base, e.g., "امتیاز پیشنهادی: ۵۰ تا ۱۵۰ نوین").
  * **Secondary Information:**
    * Explanatory text inside the hero banner (light silver-gray `#B0B8C4` or enclosed in a dark pill container with a subtle border).
    * Activity descriptive text inside each card (muted cool-gray body text `#9AA5B1` explaining requirements).
  * **Supporting Information:**
    * Semantic 3D/glowing icon badge on the right edge of each card for fast visual indexing, paired with a matching glowing neon card border.
  * **Interactive Actions:** Completely absent from the card feed; interactions are strictly limited to the bottom navigation tabs.

## 7. Components & Content Patterns

* **OBSERVATION:**
  * **App Header:** Flat, dark-themed header element providing immediate orientation without unnecessary back-buttons (as it is a primary tab).
  * **Hero Motivation Card:** High-contrast dark card (`#131822`) framed by a glowing neon perimeter border (e.g., coral-red `#FF4B2B` or neon green `#64DD17`), containing student greeting, purpose description inside a dark pill sub-box, and the 3D blue bird mascot.
  * **Display-Only Guidance Card:**
    * Dark matte container (`#131822`) with a thin, semantic neon glowing border (gold/amber, neon green, or electric cyan/blue).
    * Fixed icon container on the right (~48x48px) featuring a dark translucent backing or vibrant 3D/neon category icon (3D gold trophy/star, glowing green shield/flag, electric blue cap).
    * Text container on the left holding white Title, muted gray Description, and glowing neon Point Value.
    * Absence of clickable affordances (no chevrons, arrows, tap shadows, or CTA buttons).
  * **Guidance Empty State Component:**
    * When no guidance cards are currently active or provisioned in the backend, the screen renders a centered, motivational empty state container below the hero greeting.
    * Features a 3D blue bird mascot illustration in an inquisitive pose, framed by a soft neon-glowing border.
    * Primary text: `«هنوز راهنمایی برای کسب نوین ثبت نشده است»` in crisp white Persian typography.
    * Secondary copy: `«به زودی فعالیت‌های جدید توسط مدرسه اضافه خواهد شد. در این فاصله می‌توانید چالش‌ها و جوایز دیگر را بررسی کنید!»` in muted slate-gray text.
* **DESIGN INTENT:** Guidance cards are strictly read-only for students. They communicate rules, expectations, and values created by administrators.

## 8. Interaction Patterns

* **OBSERVATION:**
  * **Visible Interactions:** Vertical touch scrolling through the card list; direct tap navigation across the bottom tab bar.
* **DESIGN INTENT:**
  * Cards are 100% non-actionable: students cannot click, expand, select, or submit from any card.
  * Zero-friction one-handed consumption: browsing requires only single-thumb vertical scrolling.
* **INFERENCE:** Because cards cannot be tapped, states such as hover, active tap compression, and ripple effects must be disabled to prevent false expectations.

## 9. Visual Language

* **OBSERVATION:**
  * **Typography:** Modern Persian sans-serif font (such as Vazirmatn, Peyda, or IRANSans) with bold, heavy-weight headings/numerals and clean body text. Numbers are formatted exclusively with Persian glyphs ("۵۰ تا ۱۵۰", "۲۰ تا ۱۰۰").
  * **Color System:**
  * **Brand Primary & Accents:** Neon Lime Green (`#64DD17` / `#76FF03`) and Vibrant Coral-Red (`#FF3D00` / `#FF5252`) applied to glowing borders, active navigation indicators, and highlight badges.
  * **Surfaces:** Deep charcoal/navy card surfaces (`#131822` / `#161C28`) over a pitch-dark midnight background canvas (`#0B0E14`).
  * **Category Accents:** Distinct neon border glows and 3D/illuminated icon badges (Gold/Amber `#FFD600` for competitive achievements, Neon Green `#64DD17` for behavioral/disciplinary habits, Electric Cyan/Blue `#00E5FF` for academic milestones).
  * **Elevation & Shape:** Generous border radii (~20–24px) across cards and the bottom navigation dock, utilizing 1px–1.5px glowing neon gradient outlines and soft outer/inner neon luminescence instead of traditional dark drop shadows.

## 10. Responsive Intent

* **OBSERVATION:** Fluid horizontal containers constrained by consistent page gutters (~16px) within the dark mobile frame. Text stacks and wraps naturally according to available width.
* **DESIGN INTENT:** Seamless adaptation across varying mobile widths (360px to 430px+) maintaining thumb accessibility and readable typography.
* **INFERENCE:** Fixed icon dimensions (~48x48px) paired with flexible text containers ensure that cards retain visual balance regardless of screen size.

## 11. UX Principles

1. **Explicit Read-Only Clarity:** Eliminating buttons, links, and selection controls signals immediately to students that the screen is a static reference rubric.
2. **Predictable Content Rhythm:** Every card presents information in the exact same visual order (Category Icon → Activity Name → Details → "نوین" Value), minimizing cognitive load during quick scanning.
3. **Ergonomic One-Handed Reach:** Placing all functional navigation at the natural bottom rest position of the thumb while reserving the rest of the screen purely for vertical reading.

## 12. Explicit Design Intent (Updated Requirements & Improvements)

* **Established Core Directives:**
  * **Platform & Ergonomics:** Mobile Web, strictly optimized for one-handed thumb use.
  * **Language & Localization:** 100% Persian (فارسی), complete RTL orientation, and mandatory Persian numerals throughout.
* **Terminology:** The reward unit is strictly **"نوین"** (Novin); the generic word "امتیاز" (point/score) should not precede it.
* **5 Top-Level Destinations:**
  1. جوایز (Awards)
  2. راهنمای نوین (Point earning guidance — current screen)
  3. رتبه‌بندی و پروفایل (Profile, dashboard & ranking)
  4. چالش‌ها (Challenges)
  5. پیشنهاد فعالیت (Student task proposals)

* **Permissions:** Guidance cards are managed exclusively by administrators (selecting predefined logos, titles, descriptions, and point values/ranges) and remain completely non-interactive for students.
* **Confirmed Rules & Constraints (Resolving Open Points):**
  * **Chronological Sorting:** The card stream is ordered strictly **newest first** (latest added guidance card appears at the very top of the list).
  * **Dynamic Content & Empty State Handling:** While the system typically contains pre-populated guidance cards, if zero cards exist (e.g. fresh installation or all cards removed by administrator), an **Empty State** is explicitly provided. The screen displays the inquisitive 3D bird mascot with motivational copy: `«هنوز راهنمایی برای کسب نوین ثبت نشده است»` and `«به زودی فعالیت‌های جدید توسط مدرسه اضافه خواهد شد.»` to prevent layout collapse.
  * **Title Constraint (30 Chars):** Activity titles are capped at a maximum of **30 characters**, ensuring titles stay on 1 or at most 2 compact lines and do not overwhelm the card header.
  * **Flexible Description Length:** Descriptions have no arbitrary character limit; the card container height expands dynamically to accommodate the full explanatory text without ellipsis truncation, preserving its role as a clear reference document.
* **Recommended Enhancements:**
  * **Terminology Refinement:** Replace "امتیاز پیشنهادی: ۵۰ تا ۱۵۰ نوین" with **"مقدار پیشنهادی: ۵۰ تا ۱۵۰ نوین"** or a standalone badge displaying **"۵۰ تا ۱۵۰ نوین"** to reinforce "نوین" as the sole currency unit.
  * **Point Value Pill Badge:** Encapsulate the "نوین" amount inside a dark translucent pill badge with a subtle neon border and glowing neon green (`#64DD17`) or gold (`#FFD600`) text (matching the pill container style seen in the hero card of the reference theme) positioned at the bottom or top-left of each card to make reward values immediately identifiable when scanning.
* **Explanatory Note in Banner:** Include a brief sentence inside a dark pill sub-container in the neon-bordered intro banner explaining how points are granted (e.g., *"نوین‌ها توسط معلمان ثبت و به حساب شما افزوده می‌شوند"*), making it immediately clear why cards cannot be clicked or submitted.

## 13. Observed Patterns

* **RTL Media-Object Pattern:** Standard right-aligned 3D/neon icon badge accompanied by left-flowing vertical white title and cool-gray descriptive text.
* **Predefined Badge Semantic Categorization:** Use of recognizable 3D/glowing graphic symbols (Gold Trophy/Star, Green Flag/Shield, Electric Blue Academic Cap) paired with matching neon card borders to immediately signal activity categories.
* **Personalized Contextual Banner:** Direct greeting of the student by first and last name inside the primary neon-bordered dark orientation banner alongside the 3D blue bird mascot.

## 14. Inferences

* **Dynamic Card Heights:** Because titles are capped at 30 characters while descriptions have no length limit, individual dark card heights will vary naturally based on description length. Generous vertical spacing (~12–16px) between neon-bordered cards will prevent visual crowding of the outer glows and maintain rhythm.
* **Single Value vs. Range Display:** The card value slot must seamlessly accommodate both exact figures (e.g., "۵۰ نوین") and variable spans (e.g., "۵۰ تا ۱۵۰ نوین") using the same dark neon-accented pill badge layout.
* **Scroll Performance with Newest-First Sorting:** Because cards are ordered newest-first, returning students will immediately see newly introduced point-earning opportunities at the top of the dark feed without scrolling. In the event that no cards are present, the empty state ensures an engaging and polished fallback experience.
