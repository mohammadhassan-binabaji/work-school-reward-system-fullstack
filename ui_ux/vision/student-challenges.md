# UX Vision

This document analyzes the visual design and user experience intent of the provided challenges and mission page reference for a Student Reward System, tailored for a mobile web application in Persian.

## 1. Reference Context

* **Product Type:** A mobile web application for a Student Reward System.
* **Target Audience:** Students interacting with the system to complete challenges and earn points ("نوین").
* **Page Purpose:** The target page is the "Challenges" (چالش‌ها) section, where students view available tasks, check fixed reward values, and submit verification requests (images and text) to earn points.

## 2. Platform & Device

* **Platform:** Mobile Web (the reference displays a browser address bar for `schoolscore.parswebapp.ir`).
* **Orientation:** Portrait.
* **Viewport Characteristics:** Standard mobile viewport with top browser chrome and bottom browser controls visible.
* **Interaction Model:** Touch-oriented (tap, scroll).

## 3. Overall Design Direction

* **Language & Localization:** Strict Right-to-Left (RTL) layout. The interface must use Persian (Farsi) language exclusively for all text, and Persian numerals (e.g., ۱, ۲, ۳) for all numbers.
* **Terminology:** The reward currency must be exclusively referred to as "نوین" throughout the interface.
* **Ergonomics:** The layout is structured for one-handed mobile usage, with critical navigation anchored at the bottom.

## 4. Layout & Spatial Structure

* **Page Structure:** A vertically scrolling single-column layout.
* **Header:** A persistent top area displaying the page title, user info, and notifications.
* **Main Content:** A stacked list of discrete cards representing individual items (challenges).
* **Navigation:** A fixed bottom tab bar spanning the full width of the screen.

## 5. Navigation

* **Navigation Model:** Persistent bottom tab bar.
* **Items (Right-to-Left):**
  1. جوایز (Awards)
  2. راهنمای نوین (Point earning guidance)
  3. رتبه‌بندی و پروفایل (Ranking and Profile)
  4. چالش‌ها (Challenges - *Target Active State*)
  5. پیشنهاد فعالیت (Student task proposals)
* **Active State:** The active tab is indicated by a vibrant neon green color and can be emphasized with a distinct shape (like a protruding hexagon for central items), while inactive tabs remain muted with dark outlines.

## 6. Information Hierarchy

* **Primary Information:** Challenge Title and the fixed "نوین" point value.
* **Secondary Information:** Challenge description/instructions and current completion limit status (e.g., "Completed 1 out of 3 times").
* **Primary Action:** "Submit Verification Request" tap-target.
* **Emphasized Elements:** The points ("نوین") and the status of the challenge (Available, Pending Review, Completed).
* **De-emphasized Elements:** Banned challenges (grayed out).

## 7. Components & Content Patterns

* **Challenge Cards:** Rectangular containers with soft rounded corners utilizing glowing neon borders instead of solid fill colors. Each card contains an illustrative 3D mascot/icon, a title, a description, and a fixed point badge.
* **Submission Interface:** A modal or dedicated screen triggered upon clicking submit, containing an image upload component and a text area for descriptions.
* **Bottom Navigation Bar:** A five-item icon-and-text tab bar set against a dark background, structurally separated from the content.
* **Status Indicators:** Visual cues to show if a challenge is "Pending Review" or "Completed".

## 8. Interaction Patterns

* **Visible Interactions:** Vertical scrolling through the list of cards. Tapping bottom navigation icons to switch contexts.
* **Inferred/Required Interactions:**
  * Tapping a challenge card's submit action opens the submission interface.
  * Uploading an image and typing a text description within the submission interface.
  * Submitting the final verification request for manual review.
  * Disabled interaction states for challenges where the student has reached their completion limit or received a temporary ban.

## 9. Visual Language

* **Typography:** A sans-serif Persian typeface with clear weight variations (bold for titles, regular for body text) using white or bright text on dark backgrounds.
* **Color Palette:** The UI employs a strict dark mode theme (deep navy/black backgrounds). Accent colors utilize vibrant neon hues (red, green, blue) for card outlines and highlights. The active brand/action color in navigation is neon green.
* **Shape & Elevation:** Elements utilize soft border radii (approx. 12-16px). Instead of drop shadows, separation is achieved using thin, brightly colored glowing neon borders around the dark-filled cards.
* **Iconography:** High-quality, 3D-rendered character mascots (e.g., a blue bird character) are used prominently to visually distinguish different content types or statuses. Secondary UI elements feature vibrant, glowing gradients.
* **Disabled State:** Banned items utilize a monochromatic, grayed-out visual treatment to indicate inactivity while maintaining visibility.

## 10. Responsive Intent

* **Fluidity:** The main content cards appear fluid, matching the width of the mobile viewport minus a consistent margin on the left and right.
* **Fixed Elements:** The bottom navigation bar is fixed to the bottom of the viewport.
* **Constraints:** No desktop layouts are implied. The design is strictly tailored for portrait mobile aspect ratios.

## 11. UX Principles

* **Clarity of Reward:** The point value ("نوین") is highly visible on every actionable item to motivate the student.
* **High Contrast & Readability:** The dark background paired with neon text and borders creates a high-contrast environment, ensuring low cognitive load and making the 3D elements pop.
* **State Visibility:** Ensuring banned challenges remain visible (but grayed out) prevents confusion about missing items and clearly communicates system status.

## 12. Explicit Design Intent

* **Language Constraint:** Every single word and number in the UI must be in Persian (فارسی).
* **Currency Naming:** The term for points must universally be "نوین".
* **Fixed Values:** The Challenges page must display fixed point values as defined by administrators.
* **Submission Workflow:** Clicking to submit a challenge must allow the student to upload an image and provide a text description.
* **Feedback Mechanism:** Updates on submission status (approved/rejected) are communicated exclusively via notifications.
* **Ban Enforcement:** When a student receives three rejections for a single challenge, the challenge must remain visible in their feed but become completely grayed out and disabled for interaction.

## 13. Observed Patterns

* Use of glowing neon strokes for card boundaries rather than solid background fills.
* Consistent vertical spacing (padding/margins) between list items.
* Integration of prominent 3D mascots to anchor individual cards and sections visually.
* Icon-right, text-left alignment for standard RTL layout structure.

## 14. Inferences

* Because the target audience is students, the dark mode, neon aesthetic, and detailed 3D mascots are intentional choices to make the system feel highly engaging, modern, and akin to a mobile game rather than a standard academic utility.
* The grayed-out state for banned items serves as a subtle deterrent, reminding users of the consequence of repeated failed submissions without completely hiding the system's available content.