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
* **Stacked Cards:** Information is clearly segmented into distinct, rounded rectangular containers (cards) with colored borders (red for points, green for ranking, blue for graph) to differentiate sections.
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
* **Rank & Total Students Card:** Tapping the card opens the **Class & School Full Leaderboard Bottom Sheet Modal** (detailed in Section 16).
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

## 16. Full Leaderboard View (Class & School Bottom Sheet Modal UX Specification)

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
  1. **«کلاس من» (My Class):** Displays class-specific roster and standings (e.g., `«۳۲ دانش‌آموز»`).
  2. **«کل مدرسه» (Whole School):** Displays school-wide ranking (e.g., `«۱۴۲ دانش‌آموز»`).
* **Active State:** Vibrant glowing neon border and neon green accent text.
* **Transition:** Instant, animated list update between scopes without page reload.

### 16.4 Pinned Self-Standing Banner (Sticky User Status)
* **Persistent Bar:** A sticky card pinned immediately above the scrollable list (or anchored at the bottom edge) showing the current student's status at all times:
  * **Rank Badge:** e.g., `«رتبه شما: ۱۲ از ۱۴۲»` (در مدرسه) or `«رتبه شما: ۴ از ۳۲»` (در کلاس).
  * **Points Balance:** Explicitly formatted with Persian terminology: `«۴۳۰ نوین»`.
  * **Trend Indicator:** Upward/downward green arrow with delta (e.g., `«↗ ۲ پله صعود»`).
  * **Quick Navigation:** Tapping this sticky bar auto-scrolls the leaderboard list directly to the student's row.

### 16.5 Leaderboard Layout Hierarchy

```
┌───────────────────────────────────────────────┐
│                   [  —  ]                     │ <- Drag Handle
│  ✕               جدول رتبه‌بندی               │ <- Header Title & Close
│ ┌──────────────────────┬────────────────────┐ │
│ │   [✓] کلاس من (۳۲)   │   کل مدرسه (۱۴۲)   │ │ <- Segmented Scope Tabs
│ └──────────────────────┴────────────────────┘ │
│ ┌───────────────────────────────────────────┐ │
│ │ ★ رتبه شما: ۴ از ۳۲      ۴۳۰ نوین    ↗ +۲ │ │ <- Pinned Self Status
│ └───────────────────────────────────────────┘ │
│                                               │
│             [ سکوی ۳ نفر برتر ]              │
│       🥈 ۲                🥇 ۱          🥉 ۳  │ <- Podium (Gold/Silver/Bronze)
│     سارا ر.              علی م.        رضا ک. │
│     ۴۸۰ نوین            ۵۲۰ نوین      ۴۶۰ نوین│
│                                               │
│ ───────────────────────────────────────────── │
│  ۴.  [👤] نرگس حسینی       ۴۴۰ نوین   سطح ۵   │
│ ┌───────────────────────────────────────────┐ │
│ │۵.  [👤] شما (محمد)        ۴۳۰ نوین   سطح ۵│ │ <- Highlighted User Row
│ └───────────────────────────────────────────┘ │
│  ۶.  [👤] امیر قاسمی       ۴۱۰ نوین   سطح ۴   │
│  ...                                          │
└───────────────────────────────────────────────┘
```

#### A. Top 3 Podium (سکوی ۳ نفر برتر)
* Prominently featured above the main list for top ranks (۱، ۲، ۳):
  * **رتبه ۱ (طلا):** Center elevated position, gold neon border glow, golden crown/trophy mascot, student name, and points badge (`۵۲۰ نوین`).
  * **رتبه ۲ (نقره):** Flanking right/left position, silver neon accent, silver medal mascot, student name, and points badge.
  * **رتبه ۳ (برنز):** Flanking position, bronze neon accent, bronze badge mascot, student name, and points badge.

#### B. Scrollable Ranked List (رتبه‌های ۴ به بعد)
* Vertically scrolling list of discrete card rows styled with dark translucent backgrounds and rounded corners:
  * **Right (RTL Start):** Distinct rank number pill in Persian numerals (`۴`, `۵`, `۶`, ...).
  * **Center:** Student avatar / tiered mascot + Student full name.
  * **Left (RTL End):** Current points balance with `«نوین»` (e.g., `«۴۱۰ نوین»`) alongside Tier indicator chip (e.g., `«سطح ۵»`).
* **Current Student Row Highlighting:**
  * When the current student appears in the list, their row features a radiant cyan/green glowing neon border and a small `«شما»` (You) badge for immediate recognition.

### 16.6 Business Rules & System Consistency
* **Active Enrolled Students Only:** Deactivated, departed, and inactive students are strictly filtered out from both class and school scopes.
* **Current Points Basis:** Ordering is computed based on active current balance (`current points`), matching backend ranking logic.
* **Tied Rank Handling:** Students with identical points share the same rank number (e.g., two students tied at rank ۵ both show `۵`, and the following student is assigned rank `۷`).
* **Number & Currency Formatting:** Strict adherence to Persian numerals (`۰, ۱, ۲, ...`) and the required currency term `«نوین»`.
