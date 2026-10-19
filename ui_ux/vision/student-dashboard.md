# UX Vision: Profile & Dashboard Page

This document analyzes the visual design and user experience intent of the provided profile/dashboard page reference for a Student Reward System, tailored for a mobile web application in Persian.

## 1. Reference Context

* **Product Type:** Student facing dashboard for a point-based reward system.
* **User Persona:** Students (presumably K-12).
* **Page Purpose:** To provide students with an immediate overview of their status (points, rank, tier), progress, history, and quick access to earning opportunities and tasks.

## 2. Platform & Device

* **Platform:** Mobile Web Application.
* **Orientation:** Vertical (Portrait).
* **Viewport:** Small screen optimized for mobile devices.
* **Interaction Model:** Touch-first.

## 3. Overall Design Direction

* **Theme:** Dark theme with neon-like accents (red, green, blue).
* **Style:** Modern, high-tech, gamified. Use of illustrative character mascots (the bird in different outfits) is central to the visual identity and engagement strategy.
* **Goal:** To make progress tracking engaging and motivating for students through clear visualization and character progression.

## 4. Layout & Spatial Structure

* **Vertical Scrolling:** The primary layout is a single column of stacked cards, indicating a scrolling behavior on mobile.
* **Header:** Fixed top header area with profile photo, notifications, and menu.
* **Stacked Cards:** Information is clearly segmented into distinct, rounded rectangular containers (cards) with colored borders (red for points, green for ranking, blue for graph, blue for activity history) to differentiate sections.
* **Latest Activities Card:** Positioned at the bottom of the scrollable content area, just above the fixed bottom navigation bar.
* **Bottom Navigation:** A fixed navigation bar at the bottom for main application sections.

## 5. Navigation

* **Global Navigation (Bottom Bar):** A five-item fixed navigation bar is evident.
* **Observed Icons/Labels (Right to Left):**
1. Gift box icon: "جوایز" (Awards)
2. Open book icon: "راهنمای نوین" (Point Earning Guidance)
3. Central hexagon trophy icon (Highlighted): Current page - "رتبه بندی و پروفایل" (Ranking & Profile)
4. Flag icon: "چالش ها" (Challenges)
5. Rocket/Plane icon: "پیشنهاد فعالیت" (Student Task Proposals)




* **Header Actions:** Top-left hamburger menu icon and notification bell icon.
* **Contextual Actions:** Buttons within cards (e.g., "Get Points", "Missions") act as shortcuts to other sections.

## 6. Information Hierarchy

* **Primary Information (Highest Visibility):**
* Current Points (نوین): Displayed very prominently in the top card as a large number (۴۳۰).
* Current Rank: Displayed clearly in the second card with a large number (۱۲).


* **Secondary Information:**
* Point Progress Gauge: Circular visual and percentage (۸۶٪).
* Student Tier: Indicated in the header (سطح ۵ - Level 5).
* Ranking Context: "از ۱۴۲ دانش آموز" (out of 142 students).
* Rank Trend Indicator: Green upward arrow.
* Weekly Balance History Graph.


* **Supporting Information:**
* Motivational messages ("You're fantastic! Keep going...").
* Graph axis labels (Dates and Balance Values).
* Subtitles for quick action buttons.



## 7. Components & Content Patterns

* **Cards:** Rounded rectangles with distinct glowing borders to group related information.
* **Interactive Rank Card:** Ranking card equipped with tap affordances (neon chevron icon `‹` in RTL and helper text `«مشاهده رتبه‌بندی کامل»`) to signal detailed view access.
* **Leaderboard Bottom Sheet Modal:** A touch-optimized mobile bottom sheet displaying full class and school leaderboards, including a drag handle, scope tabs, top 3 podium, and scrollable list.
* **Latest Activities Card:** A blue-bordered card at the bottom of the page showing the 3 most recent point transactions with a `«بیشتر»` button to open the full history.
* **Activity History Bottom Sheet Modal:** A full-screen bottom sheet with date-grouped, filterable activity history in Persian.
* **Progress Indicators:**
* Circular gauge for tier progress.


* **Charts:** Line graph for weekly balance history.
* **Buttons:** Standard action buttons with icons, main labels, and brief descriptions.
* **Mascot Illustrations:** Recurring bird character used for engagement and visual context.
* **Typography:** Clear Persian (Farsi) typeface, utilizing scale to create a strong hierarchy (large numbers for points/rank).
* **Icons:** Simple line-art icons for standard mobile actions (menu, notifications, trending).

## 8. Interaction Patterns

* **Tap/Click:**
* Menu and notification icons in the header.
* **Rank & Total Students Card:** Tapping the card opens the **Class & School Full Leaderboard Bottom Sheet Modal** (detailed in Section 17).
* **Latest Activities Card:** Tapping `«بیشتر»` opens the **Full Activity History Bottom Sheet Modal** (detailed in Section 16.0.3).
* Individual cards might link to more detailed views.
* Quick action buttons ("More Points", "Missions").
* Bottom navigation items to switch pages.


* **Scroll:** Vertical scrolling to view all stacked cards.

## 9. Visual Language

* **Palette:** Dark background, vibrant accent colors (red, cyan, bright green).
* **Imagery:** Distinct illustrative style with cartoon mascots. High-tech/neon borders and glow effects.
* **Shape:** Use of rounded corners and hexagonal shapes (for the active nav item icon).
* **Contrast:** High contrast between text/elements and the dark background for legibility.

## 10. Responsive Intent

* The single-column stacked layout naturally adapts to different mobile screen widths.
* Top header and bottom navigation appear to be fixed, while content scrolls in between.

## 11. UX Principles

* **Gamification:** Prominent display of points, tiers, rank, progress gauges, trophies, and motivational feedback loops (messages, mascot).
* **Progression:** Clear visualization of moving towards the next level/goal.
* **Content Prioritization:** The most critical stats (points, rank) are large and easily glanceable.
* **Clarity:** Use of distinct sections and colors for different types of information.

## 12. Explicit Design Intent (User-Provided)

* **Platform:** Mobile Web (verified by reference).
* **Language:** Persian (Farsi) exclusively for text and numbers.
* **Optimized for One-Handed Use:** Stacked card layout and prominent bottom navigation support this.
* **Terminology:** "Point" must always be translated/referenced as "نوین".
* **App Pages (5 total):**
1. Awards (جوایز)
2. Point earning guidance (راهنمای نوین)
3. Profile/Dashboard/Ranking (رتبه بندی و پروفایل) - *This reference page.*
4. Challenges (چالش ها)
5. Student task proposals (پیشنهاد فعالیت)



## 13. Observed Patterns

* Recurring card structure with colorful borders for data segmentation.
* Character progression/status indicated by mascot appearance.
* Persian numbers (e.g., ۱۲, ۴۳۰) are correctly used.

## 14. Inferences

* The red/pink color of the point card and gauge might indicate that the progress is close to a major milestone or potential tier up.
* The circular progress gauge likely visualizes progress specifically towards the *next* student tier.
* The line graph uses dates on the X-axis in a specific MM/DD format in Persian numbers.

## 15. Open Questions / Recommendations for AI Agent

* **Terminology Check:** Ensure the phrase "امتیاز فعلی شما" is revised to incorporate the "نوین" translation clearly (e.g., "تعداد نوین شما" or displaying "۴۳۰ نوین").
* **Mascot Usage:** Establish a clear rule for how the mascot character changes (outfits, items like trophies) to reflect student status or achievements.
* **Dashboard Enhancements:**
* Consider adding a brief feed of **recent activity** (e.g., "امروز: +10 نوین برای تکلیف ریاضی").
* Add a visual target for the **next tier goal** (e.g., display "۷۰ نوین دیگر تا سطح ۶").
* Can the weekly balance history graph be **tapped** to see specific data points for a single day?
* Make the rank card linkable to view the **full leaderboard** (class/school). *(Resolved: Fully specified in Section 16 below as an interactive bottom sheet modal with class/school toggles).*

## 16. Latest Activities Section (آخرین فعالیت‌ها)

### 16.0 Overview

At the bottom of the profile/dashboard page — above the fixed bottom navigation bar — a **Latest Activities card** displays the student's three most recent point-earning or point-deducting events. This section provides a quick glance at recent history and offers a clear path to the full activity log via a "بیشتر" (More) button.

### 16.0.1 Card Structure & Visual Style

* **Card Type:** Dark translucent card with a **blue neon glowing border**, consistent with the weekly graph card style.
* **Card Title (Right-aligned, RTL):** `«آخرین فعالیت‌ها»` — displayed in white/light text at the top of the card.
* **Activity Count:** Shows exactly the **last 3 activities**, ordered from most recent to oldest (top to bottom).
* **"بیشتر" Button:** A subtle text button or outlined pill button aligned to the left (RTL end) of the card title row, labeled `«بیشتر ›»`. Tapping it opens the Full Activity History Bottom Sheet (Section 16.0.3).

### 16.0.2 Activity Row Layout

Each of the 3 rows follows a consistent compact layout:

```
┌──────────────────────────────────────────────────┐
│  [آیکون]   عنوان فعالیت              +۱۵ نوین   │
│            ۱۴۰۳/۰۷/۱۸  ساعت ۱۴:۳۰              │
└──────────────────────────────────────────────────┘
```

* **Right (RTL Start):** A small circular colored icon indicating activity type:
  * 🟢 Green `+` icon for point gains (e.g., homework, attendance, challenge completion).
  * 🔴 Red `−` icon for point deductions (exclusively from student reward redemptions or rare administrative adjustments; teachers only award positive points and do not issue negative penalties).
* **Center:** Activity title in Persian (e.g., `«انجام تکلیف ریاضی»` or `«دریافت جایزه: دفترچه یادداشت»`), with the Persian date and time below in smaller muted text (e.g., `«۱۴۰۳/۰۷/۱۸ — ساعت ۱۴:۳۰»`).
* **Left (RTL End):** Point delta displayed prominently:
  * Gains: bright green text, e.g., `«‎+۱۵ نوین»`.
  * Deductions: red text, e.g., `«‎−۵۰ نوین»`.
* **Row Separator:** A thin subtle divider line between rows.

### 16.0.3 Full Activity History — Bottom Sheet Modal

#### Trigger & Entry
* Tapping `«بیشتر»` on the Latest Activities card slides up a bottom sheet with the full chronological activity history.

#### Container & Presentation
* **Form Factor:** Mobile bottom sheet sliding up from the bottom with smooth spring physics.
* **Viewport Coverage:** 85%–90% of screen height.
* **Backdrop:** Semi-transparent dark overlay (`rgba(10, 14, 26, 0.75)`) with `backdrop-blur-md`.
* **Dismiss Interactions:**
  * Top centered drag pill handle (`دستگیره کشیدن`) supporting drag/swipe down to close.
  * Dedicated top-left close icon button (`✕`).
  * Tap outside on backdrop closes the sheet.

#### Modal Header
* **Title (centered):** `«تاریخچه فعالیت‌ها»`
* **Close button (top-left):** `✕`

#### Filter & Sort Controls (Pinned below header)
* A horizontal scrollable chip row for quick filtering:
  * `«همه»` (All) — default selected, glowing neon border when active.
  * `«کسب نوین»` (Points Earned)
  * `«کسر نوین»` (Points Deducted)
* Sort order is chronological (newest first) by default.

#### Scrollable Activity List

```
┌───────────────────────────────────────────────────────┐
│                 [  —  ]                               │ <- Drag Handle
│  ✕           تاریخچه فعالیت‌ها                        │ <- Header
│ ┌─────────┬───────────────┬───────────────────────┐  │
│ │  همه ✓  │  کسب نوین     │  کسر نوین             │  │ <- Filter Chips
│ └─────────┴───────────────┴───────────────────────┘  │
│                                                       │
│  ─── ۱۴۰۳/۰۷/۱۸ ──────────────────────────────────  │ <- Date Group Header
│  🟢  انجام تکلیف ریاضی              ‎+۱۵ نوین  ۱۴:۳۰ │
│  🟢  حضور منظم در کلاس              ‎+۵ نوین   ۰۸:۰۰  │
│  ─── ۱۴۰۳/۰۷/۱۷ ──────────────────────────────────  │
│  🔴  دریافت جایزه: دفترچه یادداشت   ‎−۵۰ نوین ۱۶:۰۰  │
│  🟢  شرکت در چالش هفتگی            ‎+۲۰ نوین  ۱۰:۳۰  │
│  ...                                                  │
└───────────────────────────────────────────────────────┘
```

* **Date Group Headers:** Activities are grouped by Persian calendar date (e.g., `«۱۴۰۳/۰۷/۱۸»`) displayed as sticky section separators in muted text.
* **Activity Rows:** Identical layout to the dashboard preview rows (icon + title + date/time + delta).
* **Empty State:** If no activities exist yet, display a centered illustration with `«هنوز فعالیتی ثبت نشده است.»`.
* **Infinite Scroll / Pagination:** Older activities load automatically as the student scrolls down (or via a `«بارگذاری بیشتر»` button).

### 16.0.4 Business Rules & System Consistency
* **Data Source:** Activity log is pulled from the backend point transaction history per student.
* **Display Limit (Dashboard Preview):** Strictly the **3 most recent** entries, regardless of date.
* **Ordering:** Always newest-first in both the preview and the modal.
* **Terminology:** Point values are always suffixed with `«نوین»`.
* **Persian Numbers:** All numbers, dates, and times must be rendered in Persian numerals (`۰–۹`).
* **Visibility:** A student can only see their **own** activity history — no cross-student visibility.

---

## 17. Full Leaderboard View (Class & School Bottom Sheet Modal UX Specification)

To provide students with transparent visibility into peer standings and foster healthy gamification, the rank card on the dashboard directly triggers a comprehensive leaderboard modal.

### 16.1 Trigger & Entry Affordance
* **Touch Target:** The entire **Rank & Total Students Card** (کارت رتبه‌بندی و جایگاه) functions as an interactive tap target.
* **Visual Affordance:**
  * Hover / active press state features a soft neon green border highlight.
  * An inline indicator with a Persian directional chevron (`‹` for RTL) and subtle helper microcopy: `«مشاهده رتبه‌بندی کامل»`.

### 16.2 Container & Presentation (Touch-First Bottom Sheet)
* **Form Factor:** Mobile bottom sheet sliding up from the bottom of the viewport with smooth spring physics (`slide-up`).
* **Viewport Coverage:** Occupies 85%–90% of screen height to maximize list visibility while maintaining background context.
* **Backdrop:** Semi-transparent dark overlay (`rgba(10, 14, 26, 0.75)`) with native `backdrop-blur-md`.
* **Dismiss Interactions:**
  * Top centered drag pill handle (`دستگیره کشیدن`) supporting drag/swipe down to close.
  * Dedicated top-left close icon button (`✕`).
  * Tap outside on backdrop closes the sheet.

### 16.3 Scope Selector (Segmented Tabs: Class vs. School)
* **Pinned Segmented Control:** Positioned at the top of the modal beneath the title header:
  1. **«کلاس من» (My Class):** Displays class-specific top board and standing context (e.g., `«۳۲ دانش‌آموز»`).
  2. **«کل مدرسه» (Whole School):** Displays school-wide top board and standing context (e.g., `«۱۴۲ دانش‌آموز»`).
* **Active State:** Vibrant glowing neon border and neon green accent text.
* **Transition:** Instant, animated update between scopes without page reload.

### 16.4 Pinned Self-Standing Banner (Sticky User Status)
* **Persistent Bar:** A prominent card pinned beneath the segmented scope control showing the current student's standing at all times:
  * **Rank Badge:** e.g., `«رتبه شما: ۱۲ از ۱۴۲»` (در مدرسه) or `«رتبه شما: ۴ از ۳۲»` (در کلاس).
  * **Points Balance:** Explicitly formatted with Persian terminology: `«۴۳۰ نوین»`.
  * **Trend Indicator:** Upward/downward green arrow with delta (e.g., `«↗ ۲ پله صعود»` or `«↗ +۲»`).

### 16.5 Leaderboard Layout Hierarchy

```
┌───────────────────────────────────────────────┐
│                   [  —  ]                     │ <- Drag Handle
│  ✕               جدول رتبه‌بندی               │ <- Header Title & Close
│ ┌──────────────────────┬────────────────────┐ │
│ │   [✓] کلاس من (۳۲)   │   کل مدرسه (۱۴۲)   │ │ <- Segmented Scope Tabs
│ └──────────────────────┴────────────────────┘ │
│ ┌───────────────────────────────────────────┐ │
│ │ ★ رتبه شما: ۱۲ از ۱۴۲    ۴۳۰ نوین    ↗ +۲ │ │ <- Pinned Self Status Banner
│ └───────────────────────────────────────────┘ │
│                                               │
│             [ سکوی ۳ نفر برتر ]              │
│       🥈 ۲                🥇 ۱          🥉 ۳  │ <- Podium (Gold/Silver/Bronze)
│     سارا ر.              علی م.        رضا ک. │
│     ۴۸۰ نوین            ۵۲۰ نوین      ۴۶۰ نوین│
│                                               │
│ ───────────────────────────────────────────── │
│  🔒 برای حفظ حریم خصوصی دانش‌آموزان،          │
│     تنها رتبه‌های برتر نمایش داده می‌شوند.     │ <- Privacy Notice (Ranks 4+ Masked)
└───────────────────────────────────────────────┘
```

#### A. Top 3 Podium (سکوی ۳ نفر برتر)
* Prominently featured in the center of the leaderboard modal for top ranks (۱، ۲، ۳):
  * **رتبه ۱ (طلا):** Center elevated position, gold neon border glow, golden crown/trophy mascot, student name, and points badge (`۵۲۰ نوین`).
  * **رتبه ۲ (نقره):** Flanking right/left position, silver neon accent, silver medal mascot, student name, and points badge.
  * **رتبه ۳ (برنز):** Flanking position, bronze neon accent, bronze badge mascot, student name, and points badge.

#### B. Peer Standings Privacy Enforcement
* In strict adherence to school privacy rules and FR-058, peer names and point balances outside the Top 3 podium are strictly masked and not accessible to students.
* The modal provides students with clear visibility into:
  1. The Top 3 recognized achievers (Podium).
  2. The student's own exact rank, point balance, and trend relative to the full class or school population.
  3. Total active student count in the scope (e.g., `از ۱۴۲ دانش‌آموز`).

### 16.6 Business Rules & System Consistency
* **Privacy Masking Compliance (FR-058):** Students see only their own rank and the top-student board. Non-top peer data is masked and omitted from the client view.
* **Active Enrolled Students Only:** Deactivated, departed, and inactive students are strictly filtered out from both class and school scopes.
* **Current Points Basis:** Ordering is computed based on active current balance (`current points`), matching backend ranking logic.
* **Tied Rank Handling:** Students with identical points share the same rank number (e.g., two students tied at rank ۱ both show `۱`, and the following student is assigned rank `۳`).
* **Number & Currency Formatting:** Strict adherence to Persian numerals (`۰, ۱, ۲, ...`) and the required currency term `«نوین»`.

---

## 18. Weekly Balance History — Scrollable Bezier Line Chart (نمودار تاریخچه نوین)

### 18.1 Overview & Core Architecture
Card 3 on the student dashboard replaces static vertical bar representations with an interactive, Android-grade smooth Bezier line chart tailored for high performance on mobile devices.

### 18.2 Visual Layout & 7-Day Viewport
* **Chart Geometry:** Smooth (Cubic Bezier) curved line chart with glowing cyan stroke (`#00F0FF`) and semi-transparent vertical gradient fill beneath the curve down to the baseline (`rgba(0, 240, 255, 0.22)` to `transparent`).
* **Visible Viewport Window:** Fixed **7-day data window** on screen at any time, maintaining optimal spacing across standard mobile screens (360px–430px).
* **Chronological Directionality:** Left-to-Right (`LTR`) chronological timeline embedded cleanly inside the Persian (`RTL`) application shell. Oldest visible date is on the left, newest date is on the right (e.g., `۰۷/۲۰` on the left, `۰۷/۲۷` on the right).
* **Static / Sticky Left Y-Axis:**
  * Scale labels (`۰, ۲۵, ۵۰...`) are anchored on the far left edge of the chart container and remain stationary as the timeline scrolls underneath.
  * An occlusion gradient / frosted background prevents overlapping dates from clashing with Y-axis tick numbers.
* **Mathematical Baseline (Non-Negative Bounds):**
  * Y-axis minimum is strictly bounded at zero ($y \ge 0$). Negative values are mathematically invalid.
  * Y-axis scale dynamically recalculates its maximum height ceiling based on the highest balance in the visible 7-day window.

### 18.3 Panning, Momentum & Lazy Loading
* **Horizontal Touch Panning (`PanX`):** Smooth touch-drag and swipe gestures horizontally inside the chart bounds. Sliding right pulls in older historical dates.
* **Inertial Momentum & Bounce:** Touch releases trigger physics-based momentum deceleration with elastic bounce-back at timeline boundaries.
* **Cursor-Based Lazy Loading:** When the user pans near the oldest loaded date boundary, an event triggers cursor pagination (`limit` + `beforeDate`) to fetch older historical snapshots without UI stutter.
* **Position Indicator:** A subtle horizontal scroll indicator pill at the bottom of the card visually communicates the position of the visible 7-day window relative to the entire loaded history.

### 18.4 Touch Scrubbing & Tooltip Lifecycle
* **Active Node Highlighting:** Scrubbing or touching any point immediately selects the closest data node, rendering a bright neon halo ring and a vertical dashed cyan drop-line aligning with the corresponding X-axis date.
* **Glassmorphic Floating Tooltip:** Displays a compact frosted glass popup directly above the active node showing:
  * Value: `[X] نوین` (in Persian numerals).
  * Date: `[ماه/روز]` (e.g., `۰۷/۲۷`).
* **Auto-Dismiss:** The tooltip and highlight ring appear on touch/drag and automatically fade out when the user lifts their finger.

### 18.5 Sparse Data Handling
* Only recorded daily snapshot dates from the database are plotted. Days without snapshot entries are not fabricated with synthetic dates.
* If snapshot history is sparse or empty, the card renders an elegant zero-baseline with a motivational empty-state indicator.

