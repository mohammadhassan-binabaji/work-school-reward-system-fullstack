# UX Vision

This document analyzes the visual design and user experience intent of the provided proposal page reference for a Student Reward System, tailored for a mobile web application in Persian.

## 1. Reference Context

**OBSERVATION:** The reference "IMG_20260925_200522_646.jpg" displays a screen from a web application hosted at `schoolscore.parswebapp.ir`.
**DESIGN INTENT:** This is the "Student task proposals" (پیشنهاد فعالیت) page of a Student Reward System. Students use this interface to submit voluntary tasks to earn "نوین" (points) upon administrator approval and completion.
**INFERENCE:** The primary user for this specific view is the student, as the instructional text addresses the user directly regarding sending requests to an administrator.

## 2. Platform & Device

**OBSERVATION:** The layout is rendered in a mobile web browser, evidenced by the top system status bar and browser address bar. The orientation is portrait.
**DESIGN INTENT:** The product is a Mobile Web platform. It must be explicitly optimized for one-handed mobile usage.
**INFERENCE:** The touch targets (such as the bottom navigation and the primary submit button) appear sized for thumb interaction, though form fields may require two-handed typing.

## 3. Overall Design Direction

**OBSERVATION:** The screen utilizes a standard vertical scrolling layout with a fixed bottom navigation bar and a top-to-bottom reading flow. The layout strictly follows Right-to-Left (RTL) formatting for the فارسی language.
**DESIGN INTENT:** All text, including numbers, must remain in Persian. The design must accommodate the lifecycle of a proposal (Pending, Ready to Do, Completed, Declined, Canceled) and facilitate messaging.
**INFERENCE:** The visual direction utilizes a deep dark background featuring glowing neon accents (such as red, green, and cyan borders) and gamified 3D mascot illustrations to elevate the engaging nature of earning "نوین".

## 4. Layout & Spatial Structure

**OBSERVATION:** The vertical structure consists of:
  * A fixed top header containing the page title.
  * An informational banner featuring a glowing neon outline on a dark background.
  * An input form card containing text fields and a submit button.
  * A section header titled "درخواست‌های ثبت‌شده".
  * A list of cards representing previously submitted requests.
  * A fixed bottom navigation bar containing five destinations.
**INFERENCE:** The form is placed above the submitted list to prioritize the creation of new proposals over the tracking of existing ones.

## 5. Navigation

**OBSERVATION:** The bottom navigation bar persists across the session and highlights the active state with a glowing neon green geometric shape (like a hexagon) and a bright icon.
**DESIGN INTENT:** The navigation must permanently house five specific routes: جوایز, راهنمای نوین, رتبه بندی و پروفایل, چالش ها, and پیشنهاد فعالیت.
**INFERENCE:** The flat navigation model allows students to switch context immediately without losing their place within the application hierarchy.

## 6. Information Hierarchy

**OBSERVATION:**
  * **Primary information:** The active page title ("فعالیت پیشنهادی") and the input fields for a new request ("موضوع" and "درخواست شما").
  * **Secondary information:** The status and title of previously submitted requests (e.g., "تایید" and "تست").
  * **Supporting information:** The instructional text explaining that an administrator will review the request and assign a "نوین" value.
**INFERENCE:** The visual weight of the glowing neon-bordered banner intentionally draws the eye first, ensuring students understand the rules before submitting a form.

## 7. Components & Content Patterns

**OBSERVATION:**
  * **Text Inputs:** Dark fields with subtle or neon-glowing bottom borders to match the overall theme.
  * **Buttons:** A solid dark or deep-toned button with a vibrant neon outline or glow for primary submission.
  * **Status Badges:** Dark badges with vibrant neon text or glowing icons indicating status.
  * **List Cards:** Dark container cards outlined with neon strokes showing a title, status, and a truncated description.
**DESIGN INTENT:**
  * Implement a space for messaging between the student and admin for each proposal.
  * Once a proposal is approved, the assigned "نوین" value must be displayed.
**INFERENCE:**
  * **Messaging Component:** To optimize for one-handed usage, tapping a submitted request card should trigger a **Bottom Sheet Modal**. This modal would slide up from the bottom of the screen, displaying a scrollable chat history and a sticky input field at the bottom for new messages.
  * **Point Display Pattern:** On the list cards, the assigned "نوین" value should be positioned in the top-left corner of the card, directly opposite the right-aligned title. This creates a clear scanning pattern: Title (Right) -> Reward Value (Left).

## 8. Interaction Patterns

**OBSERVATION:**
  * **Scroll:** Vertical scrolling is required to view the list of submitted requests below the fold.
  * **Tap:** Tapping input fields to invoke the keyboard, tapping the submit button, and tapping navigation icons.
**DESIGN INTENT:** Submissions are immutable. The student cannot edit the subject or the request description after the form is submitted.
**INFERENCE:** Tapping an existing card opens the messaging bottom sheet, but the original request text within that sheet will be rendered as read-only text, not editable input fields.

## 9. Visual Language

**OBSERVATION:** The visual language relies on a deep dark background (almost black or dark navy) with vibrant neon-colored glowing borders (like red, green, and blue) for cards and sections. Typography is completely in فارسی, using white or light grey for maximum readability against the dark canvas. Elevation and shadows are replaced by glowing neon strokes and subtle inner glows rather than traditional drop shadows.
**DESIGN INTENT:** Statuses must be visually differentiated using strictly colored labels.
**INFERENCE:** A dedicated neon color palette should be assigned to the lifecycle labels to fit the dark gamified theme:
  * Pending to Approve: Neon Yellow/Orange label
  * Ready to Do: Neon Cyan/Blue label
  * Completed: Neon Green label
  * Declined: Neon Red label
  * Canceled: Dark Grey/Dim label

## 10. Responsive Intent

**OBSERVATION:** Elements like the banner, form card, and list items span nearly the full width of the viewport with consistent horizontal padding. The bottom navigation divides its space equally among the five icons.
**INFERENCE:** The fluid width of the cards indicates they will stretch or compress based on device width, while the bottom bar remains fixed. The design is strictly tailored for mobile; a desktop viewport would likely stretch these elements too far unless constrained by a maximum width container.

## 11. UX Principles

**OBSERVATION:**
  * **Quick access:** The form to create a new task is immediately available upon opening the page, bypassing the need for a floating action button (FAB).
  * **System visibility:** The glowing status badge provides immediate visual feedback regarding the state of a submitted item.
**INFERENCE:** The layout prioritizes task orientation and low cognitive load by keeping the interface flat and clearly separating the "input" zone from the "tracking" zone.

## 12. Explicit Design Intent

* The application operates strictly in the Persian (فارسی) language.
* The currency/points are universally referred to as "نوین".
* The product must be optimized for one-handed mobile usage.
* The navigation must contain exactly five specified sections.
* The system requires a messaging interface within the context of individual task proposals.
* Submitted proposals are read-only; students cannot edit the title or description after submission.
* Proposal statuses must be identified via distinctly colored labels.

## 13. Observed Patterns

**OBSERVATION:**
  * **Form-over-list:** Placing the data entry mechanism directly above the data visualization list.
  * **Sticky Bottom Navigation:** Maintaining core navigational elements at the bottom edge of the screen.
  * **Status Badging:** Using color-coded neon tags inside list items to indicate workflow states against the dark theme.

## 14. Inferences

* **Messaging UX Integration:** The messaging bottom sheet will serve a dual purpose: displaying the immutable original request at the top alongside the assigned "نوین" value, and hosting the active communication thread below it. This prevents the user from losing context while messaging the admin.
* **Value Visibility:** Placing the "نوین" value in the top-left of the card ensures it does not compete visually with the status badge.