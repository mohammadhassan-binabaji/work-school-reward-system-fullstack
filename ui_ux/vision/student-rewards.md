# UX Vision: Rewards Page

This document analyzes the visual design and user experience intent of the provided Reward page reference for a Student Reward System, tailored for a mobile web application in Persian.

## 1. Reference Context

**OBSERVATION:** The reference catalog view titled «جوایز» (Awards/Rewards) hosted at schoolscore.parswebapp.ir displays a grid of school-related reward items (e.g., «دفترچه یادداشت» / Notebook, «کیف مدرسه» / School Bag, «هدیه نقدی ۱۰۰ هزار تومانی» / 100,000 Toman Cash Gift) alongside point costs, inventory counts, and action buttons, styled to match the project's gamified dark-mode visual identity.

**DESIGN INTENT:** This screen serves as the unified Rewards Hub («جوایز») in the Student Reward System. It splits into two sub-views via a secondary toggle: «جوایز فعال» (Active Awards) for browsing and requesting available school rewards, and «تاریخچه» (History) for tracking the real-time status of requested rewards (Pending to Approve, Pending to Receive, Completed, Declined).

**INFERENCE:** Centralizing both catalog browsing and request tracking inside «جوایز» prevents students from hunting across different pages (like Profile) to see if their requested reward is ready for pickup or why a request was declined.

## 2. Platform & Device

**OBSERVATION:**

* **Platform:** Mobile Web (evidenced by the top URL bar schoolscore.parswebapp.ir and bottom browser navigation toolbar with back, forward, new tab, tab count, and menu icons).
* **Orientation & Viewport:** Portrait orientation, standard narrow smartphone viewport (~375px–412px logical width).
* **Vertical Space Constraints:** Dual browser chrome (top URL bar and bottom browser bar) compresses the usable vertical viewport, leaving roughly two rows of cards visible at once.

**DESIGN INTENT:** Optimize the mobile web experience specifically for one-handed mobile usage in a Right-to-Left (RTL) Persian («فارسی») layout. All secondary details, descriptions, and rejection explanations open in thumb-friendly dark-themed Bottom Sheets rather than navigating to new pages or top-anchored modals.

**INFERENCE:** Supporting horizontal swipe gestures to switch between the «جوایز فعال» and «تاریخچه» tabs—in addition to tapping the top toggle—will significantly improve one-handed ergonomics so the user doesn't have to stretch their thumb to the top of the screen.

## 3. Overall Design Direction

**OBSERVATION:** The visual identity uses a gamified, high-contrast dark mode theme featuring a deep navy-black background, dark matte cards with glowing neon gradient borders (neon green, cyan-blue, fiery red-orange, and warm gold), 3D illustrated mascot accents (the blue bird character with a cap), a 2-column vertical scrolling grid, and a dark rounded bottom navigation dock with a glowing neon green active state.

**DESIGN INTENT:** Deliver a localized, 100% Persian («فارسی») storefront using heavy, high-contrast Persian numerals (۰-۹) and the term «نوین» for points everywhere. The interface must clearly distinguish between browsing active catalog items («جوایز فعال») and reviewing past/active requests («تاریخچه»), while enforcing business rules around non-cancelable requests, duplicate pending request prevention, and zero-inventory items.

## 4. Layout & Spatial Structure

**OBSERVATION:**

* **Header:** Fixed/sticky dark top app bar seamlessly blending into the obsidian background, containing the centered page title «جوایز» in crisp white text and a dark pill-shaped balance badge on the left with a neon border glow and gold star icon (1100 ★).
* **Main Content Area:** Vertically scrolling container on a deep dark canvas displaying a 2-column grid of dark, neon-bordered vertical reward cards. Partial cards are visible at the top and bottom edges, indicating active vertical scroll.
* **Bottom Navigation:** Fixed 5-item dark capsule tab bar with a subtle green border glow anchored at the bottom of the web viewport, directly above the browser's native bottom toolbar.

**DESIGN INTENT:**

* **Top App Bar:** Displays the title «جوایز» in bold white typography and the student's current «نوین» balance in heavy Persian numerals inside a glowing dark pill badge (e.g., ۱۱۰۰ ★).
* **Sub-Navigation Toggle / Collapsible Header Section:** Immediately below the header (or integrated as a collapsible/sticky bar at the top of the «جوایز» view), a 2-segment dark glassmorphic toggle with a glowing neon active indicator switches between:
  * **«جوایز فعال» (Active Awards — Default View):** 2-column grid of available rewards framed in dark cards with subtle neon borders, showing cost, inventory («موجودی»), and redemption CTA buttons.
  * **«تاریخچه» (History View):** Grid or list of requested reward cards displaying the item image, title, cost, and glowing semantic neon status badge—explicitly omitting the «دریافت» (Redeem) button and omitting the «موجودی» (Inventory) count.
* **Bottom Sheet Layer:** A sliding dark-matte modal sheet with a glowing top border edge anchored to the bottom of the viewport used for (a) viewing reward details/descriptions in «جوایز فعال», (b) confirming irreversible redemption requests, and (c) viewing admin decline reasons and refund notices in «تاریخچه».

## 5. Navigation

**OBSERVATION:**

* **Navigation Model:** Persistent dark rounded bottom tab bar bordered by a thin neon-green outline, featuring 5 top-level destinations ordered Right-to-Left (RTL):
  * **جوایز (Awards)** — Gift box icon; when active, highlighted with an elevated glowing neon-green hexagonal frame, bright icon, and a solid neon-green bottom pill label.
  * **راهنمای نوین (Point Earning Guidance)** — Open book icon, muted slate-gray inactive state.
  * **رتبه‌بندی و پروفایل (Profile / Ranking)** — Trophy icon, muted slate-gray when inactive (or elevated in the glowing neon-green hexagon when active).
  * **چالش‌ها (Challenges)** — Flag icon, muted slate-gray inactive state.
  * **پیشنهاد فعالیت (Student Task Proposals)** — Paper airplane/send icon, muted slate-gray inactive state.

**DESIGN INTENT:**

* **Primary Navigation:** 5 persistent bottom tabs inside the dark neon-bordered dock:
  * جوایز (Awards)
  * راهنمای نوین (Point earning guidance)
  * رتبه‌بندی و پروفایل (Profile, dashboard, and ranking)
  * چالش‌ها (Challenges)
  * پیشنهاد فعالیت (Student task proposals)

* **Secondary Navigation (Local to «جوایز»):** Segmented dark tab toggle at the top of the page switching between «جوایز فعال» and «تاریخچه» using a glowing neon active state.

**INFERENCE:** Adding a small glowing neon-green numeric badge or dot (matching the notification bell badge style `۳`) on the «تاریخچه» tab when a request status changes (e.g., moves to Pending to Receive or Declined) will help students notice state changes since there are no SMS or external notifications.

## 6. Information Hierarchy

**OBSERVATION:**

* **Primary Information:** Student's total balance (1100 ★) in the top header; Reward Title (bold crisp white text) and Affordability/Action state (vibrant neon-green «دریافت» button vs. dark muted gray «امتیاز ناکافی» button) on each card.
* **Secondary Information:** Reward cost (1000 امتیاز, 2500 امتیاز) in bright cyan/white text accompanied by a glowing gold star icon.
* **Supporting Information:** Remaining inventory count (موجودی: 29, موجودی: 15) in smaller muted cool-gray text; dark atmospheric media container with a glowing gift box or 3D mascot-styled illustration at the top of each card.

**DESIGN INTENT:**

* **In «جوایز فعال» (Active Awards Tab):**
  * **Primary:** Reward Title (white), Affordability/Eligibility CTA State (Available vs. Insufficient «نوین» vs. Already Pending vs. Out of Stock).
  * **Secondary:** Cost in «نوین» (e.g., ۱۰۰۰ نوین ★) with a gold star accent.
  * **Supporting:** Remaining Inventory (موجودی: ۲۹) in muted slate-gray.
  * **Progressive Disclosure (Bottom Sheet on Card Tap):** Full reward image and detailed description / pickup instructions on a dark elevated sheet.

* **In «تاریخچه» (History Tab):**
  * **Primary:** Reward Title (white) and glowing Neon Request Status Badge (Pending to Approve 🔵, Pending to Receive 🔵, Completed 🟢, Declined 🔴).
  * **Secondary:** Cost in «نوین» (۱۰۰۰ نوین ★).
  * **Intentionally Omitted:** Inventory count («موجودی») and Redeem button («دریافت») are strictly hidden on History cards.
  * **Progressive Disclosure (Bottom Sheet on Card Tap for Declined 🔴 items):** Admin rejection reason text + static confirmation message that deducted «نوین» have been returned to the student's balance, styled inside a red-orange neon-bordered alert box.

## 7. Components & Content Patterns

**OBSERVATION:**

* **Balance Pill Badge (Header):** Rounded dark translucent pill with a thin glowing border containing bold white numeric value and a glowing gold star icon.
* **Reward Card (2-Column Grid Item):** Dark charcoal/navy card surface (`#131720` approx.) framed by a subtle glowing neon border; top half features a dark inner container with a subtle radial glow behind the reward graphic/icon; bottom half contains right-aligned white Title, Cost, muted gray Inventory, and a full-width pill CTA button.

**DESIGN INTENT (Component Specifications):**

1. **Active Catalog Card (in «جوایز فعال»):**
   * Displays thumbnail image/illustration on a dark glowing backdrop, white Title, Cost ([عدد] نوین ★), muted gray Inventory (موجودی: [عدد]), and a bottom pill button.
   * **4 Distinct Button States on Active Catalog Cards:**
     * **State A — Eligible & Available:** Vibrant Neon-Green button (`#39FF14` / `#4ADE80` approx.) with dark/black bold text or glowing green border with white text: «دریافت» (Redeem).
     * **State B — Insufficient Balance:** Disabled Dark Slate-Gray button (`#1E2430` approx.) with subtle border and muted gray text: «نوین ناکافی» (Insufficient Novin).
     * **State C — Duplicate Pending Request (Student already has a pending request for this specific reward):** Disabled Muted Cyan-Blue/Dark Gray button with dim cyan border: «در حال بررسی / درخواست فعال» (Already Pending — prevents requesting the same item while one is pending, while leaving other rewards open).
     * **State D — Out of Stock (موجودی: ۰):** Disabled Dark Matte Gray button with low-opacity text: «ناموجود» (Out of Stock).

2. **History Request Card (in «تاریخچه»):**
   * Displays thumbnail image/illustration, white Title, Cost ([عدد] نوین ★), and a glowing Neon Status Label/Badge (plus matching card border glow) in place of the action button and inventory line.
   * **4 Semantic Status Badges:**
     * **🔵 در انتظار تایید (Pending to Approve)** — Glowing Electric Cyan-Blue badge and card border accent (`#00E5FF` / `#38BDF8` approx., matching the weekly chart's cyan-blue glow).
     * **🔵 در انتظار دریافت (Pending to Receive)** — Glowing Electric Cyan-Blue badge (visually differentiated via a solid cyan fill or box-ready icon so students know it is approved and ready to collect).
     * **🟢 تکمیل شده / تحویل شده (Completed)** — Glowing Neon Lime-Green badge and card border accent (`#4ADE80` approx., matching the rank card's green neon glow).
     * **🔴 رد شده (Declined)** — Glowing Fiery Red-Orange badge and card border accent (`#FF453A` approx., matching the top score card's red-orange neon glow, with a subtle visual cue like an info icon ⓘ or «مشاهده علت» indicating the card can be tapped for details).

3. **Active Award Detail Bottom Sheet (Triggered by tapping card body in «جوایز فعال»):**
   * Dark obsidian surface with a subtle neon top-border glow and drag handle.
   * Large/full aspect-ratio image of the reward illuminated against the dark surface.
   * Full reward title in bold white, «نوین» cost with gold star, and remaining inventory.
   * Detailed description text in readable light gray (rules, approval requirement note, or pickup instructions).
   * Sticky bottom CTA button («دریافت» in glowing neon green or corresponding disabled dark state) inside the thumb zone, plus confirmation step warning that points are deducted immediately and cannot be canceled.

4. **History Detail / Declined Reason Bottom Sheet (Triggered by tapping a card in «تاریخچه»):**
   * **For Declined (رد شده 🔴) cards:** Displays the reward summary on a dark sheet with a red-orange neon border accent, the glowing red status badge, the Admin's Rejection Reason text in white, and a prominent Static Refund Notice inside a dark pill container with a neon accent (e.g., «نوین‌های کسر شده برای این درخواست به حساب شما بازگردانده شد.» — The deducted Novin points have been returned to your balance).
   * Dark pill Close button («بستن») with a subtle neon border at the bottom of the sheet for easy one-handed dismissal.

## 8. Interaction Patterns

**OBSERVATION:**

* **Vertical Scrolling:** Primary browsing mechanism for the 2-column reward grid against the deep dark background.
* **Direct Tap on Card CTA:** Tapping the neon-green «دریافت» button initiates redemption; dark muted gray buttons are non-interactive/disabled.
* **Bottom Tab Switching:** Single tap on bottom bar icons switches top-level views, shifting the glowing neon-green hexagonal highlight and green pill label to the active tab.

**DESIGN INTENT:**

* **Tab Toggle / Collapsible Switch:** Tap (or horizontal swipe) between «جوایز فعال» and «تاریخچه», smoothly animating the neon border/fill highlight between tabs.
  * **Card Body Tap vs. Button Tap (in «جوایز فعال»):**
    * Tapping the dark card body/image opens the Reward Detail Bottom Sheet (showing full image and detailed description).
    * Tapping the neon-green «دریافت» button opens the Redemption Confirmation Bottom Sheet (or initiates redemption from inside the Detail Bottom Sheet) so students don't accidentally spend «نوین» while scrolling.
  * **History Card Tap (in «تاریخچه»):**
    * Tapping a Declined (🔴) red-glowing card opens the Declined Explanation Bottom Sheet displaying the specific rejection reason and the static refund confirmation text.
    * Tapping other history cards (Pending to Receive, Pending to Approve, Completed) can optionally open the dark bottom sheet showing the item description/pickup instructions.
  * **Bottom Sheet Dismissal:** Swiping down on the dark sheet, tapping the darkened backdrop scrim, or tapping the bottom «بستن» / «انصراف» button closes the sheet one-handed.

## 9. Visual Language

**OBSERVATION:**

* **Color Palette:** Deep obsidian/navy-black app background (`#0B0E14` approx.), dark matte charcoal card surfaces (`#131720` approx.), vibrant neon lime-green primary action and active navigation glow (`#4ADE80` / `#39FF14` approx.), electric cyan-blue informational/pending glow (`#00E5FF` / `#38BDF8` approx.), fiery red-orange alert/declined glow (`#FF453A` approx.), warm gold star and trophy accents (`#FACC15` approx.), crisp white primary typography (`#FFFFFF`), and muted slate-gray secondary text and inactive icons (`#8E9BAE` approx.).
* **Shape & Elevation:** Generously rounded dark cards (~18px–24px radius) defined by 1px–2px glowing neon gradient borders and soft outer neon bloom shadows rather than traditional light-mode drop shadows; full pill buttons and badges; hexagonal glowing frame for the active bottom nav icon; accompanied by vibrant 3D blue-bird mascot illustrations where appropriate (e.g., empty states or header banners).

**DESIGN INTENT:**

* Adopt the cohesive, gamified dark-mode neon aesthetic across the entire «جوایز» experience while enforcing strict semantic neon glows for request statuses:

  * **Electric Cyan-Blue Glow (🔵):** Pending to Approve & Pending to Receive
  * **Neon Lime-Green Glow (🟢):** Completed (in History) & Eligible «دریافت» CTA (in Active Awards)
  * **Fiery Red-Orange Glow (🔴):** Declined (in History)

* Ensure all typography uses a clean, bold Persian typeface (matching the heavy display weight used for numerals like `۴۳۰` and `۱۲`) with proper kerning (fixing the «چالش‌ها» glyph overlap) and strict Persian numerals (۰۱۲۳۴۵۶۷۸۹).

## 10. Responsive Intent

**OBSERVATION:** The 2-column grid uses equal-width fluid dark cards with uniform gap spacing and outer container padding inside a dark framed mobile viewport.

**DESIGN INTENT:**

* Maintain the 2-column dark neon card grid for both «جوایز فعال» and «تاریخچه» on standard mobile viewports so students can scan multiple items quickly without neon border glows bleeding into adjacent cards.
* Standardize card heights within each row using 2-line title truncation (`line-clamp: 2`) on the grid view, relying on the dark Bottom Sheet to display full, untruncated titles and long descriptions when tapped.

### 11. UX Principles

* **Progressive Disclosure via Bottom Sheets:** Keep dark grid cards clean, atmospheric, and scannable; reveal heavy text (reward descriptions, admin rejection reasons, point refund notices) inside thumb-friendly dark bottom sheets on tap.
* **Context-Specific Card Density:** Show inventory and glowing action buttons only where actionable («جوایز فعال»), and strip them out in the tracking view («تاریخچه») so semantic neon status badges and border glows command 100% of the user's attention.


* **Guardrails Against Duplicate & Accidental Requests:** Prevent duplicate pending requests for the same item while allowing concurrent requests for different items, and protect irreversible «نوین» deductions with clear confirmation.
* **Transparent In-App Feedback:** Because external notifications (SMS/email) do not exist, every status transition—especially a declined request and its automatic «نوین» refund—is explicitly highlighted with high-contrast neon status cues and explained inside the History bottom sheet.



## 12. Explicit Design Intent

All user-confirmed requirements for Page 1 («جوایز»):

* **Language & Numerals:** 100% Persian («فارسی») text and bold Persian numerals (۰-۹).
* **Currency Name:** Points are strictly labeled «نوین» everywhere.
* **Visual Theme:** Dark-mode gamified UI with deep obsidian backgrounds, dark matte cards, glowing neon borders (green, cyan-blue, red-orange, gold), and floating hexagonal neon-green active bottom navigation.

* **Sub-Navigation Structure:** A secondary dark neon tab/toggle (collapsible section at the top of the «جوایز» page) switching between:
  * «جوایز فعال» (Active Awards)
  * «تاریخچه» (History)

* **Active Awards Rules («جوایز فعال»):**
  * Displays dark neon-bordered reward cards with image, white title, «نوین» cost with gold star, muted inventory count («موجودی»), and neon-green redeem button («دریافت»).
  * Tapping the reward card body opens a Dark Bottom Sheet displaying the full image and detailed description.
  * Students can request a reward only if they have sufficient «نوین», inventory > 0, and do not already have a pending request for that exact same reward.
  * Students can request a different reward even if they have another reward currently pending.
  * Requesting immediately deducts «نوین» and cannot be canceled.


* **History Rules («تاریخچه»):**
* Displays dark cards of requested award items with their current glowing neon status badge and matching border accent:
  * Pending to Approve (🔵 Electric Cyan-Blue)
  * Pending to Receive (🔵 Electric Cyan-Blue)
  * Completed (🟢 Neon Lime-Green)
  * Declined (🔴 Fiery Red-Orange)

* History cards must NOT have a «دریافت» (Redeem) button and must NOT display an inventory availability count («موجودی»).
* When a student taps a Declined (🔴) card in «تاریخچه», it opens a Dark Bottom Sheet with red-orange neon accents showing:
  * The specific rejection reason text.
  * A static message stating that the deducted «نوین» have been returned to their balance (shown only inside this bottom sheet).


## 13. Observed Patterns

All functional patterns from the catalog prototype (schoolscore.parswebapp.ir) have been unified with the project's dark-mode neon visual identity (obsidian backgrounds, glowing neon card borders, 3D blue bird mascot styling, and the hexagonal neon-green active bottom nav dock), while prototype gaps (Western numerals, «امتیاز» wording, missing «تاریخچه» toggle, and bottom nav text truncation/overlap) are flagged for correction by the downstream UI design agent.

## 14. Inferences

* **Distinguishing the Two Blue States (Pending to Approve vs. Pending to Receive):** Because both states use Electric Cyan-Blue (🔵) per spec, using a glowing clock/hourglass icon with a subtle dashed/dimmed cyan border for «در انتظار تایید» (Pending to Approve) and a solid glowing cyan pill with a check/box-ready icon for «در انتظار دریافت» (Pending to Receive) will help students immediately tell when they need to wait versus when they should walk to the school office to pick up their reward.

* **Collapsible Top Toggle Behavior:** As the student scrolls down through a long list of rewards in «جوایز فعال» or «تاریخچه», collapsing the top dark sub-tab toggle on scroll-down and revealing it immediately on a slight scroll-up maximizes vertical screen real estate on compact mobile web viewports.
