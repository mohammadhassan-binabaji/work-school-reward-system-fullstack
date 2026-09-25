---
name: ux-foundation
description: 'Establish the UX foundation of a product by translating product requirements, system behavior, user needs, and approved design direction into clear UX goals, user needs, core journeys, information needs, UX-relevant states, permissions, principles, and constraints. Use for defining the UX foundation before information architecture, user flows, screen specifications, wireframes, or visual design.'
argument-hint: 'Provide the product context, requirements, specifications, and UX Vision references to analyze and turn into a UX foundation.'
user-invocable: true
--------------------

# UX Foundation

## Purpose

Establish the UX foundation of the product by translating product requirements, system behavior, and approved visual/design intent into a clear set of UX principles, user needs, journeys, information needs, and UX constraints.

This skill is a semantic bridge between product requirements and later UX activities such as Information Architecture, User Flows, Screen Specifications, Wireframes, and Visual Design.

The goal is **not to design screens**. The goal is to establish what the UX needs to achieve.

---

## Sources

Inspect the following sources before making UX decisions:

### 1. `/docs`

Primary source for:

* Product goals
* Business requirements
* User stories
* Business rules
* User needs
* Product scope
* Domain terminology

Treat these as the primary source of product intent.

### 2. `/specs`

Use Spec Kit artifacts to understand:

* Defined system behavior
* Domain constraints
* Roles and permissions
* Important states
* Backend capabilities
* API/domain behavior relevant to UX

Do not reinterpret or change product requirements based on implementation details.

### 3. `/backend`

Use only for verification and additional context.

For example:

* Verify whether a required capability actually exists.
* Understand available states or operations.
* Detect discrepancies between specification and implementation.

Do not use the current implementation as the source of truth for product UX decisions.

### 4. `/ui_ux/vision`

Read all relevant UX Vision documents.

These documents represent visual/design intent extracted from references and user decisions.

Treat them as UX/design direction, not as product requirements.

Do not invent product features based on visual references.

---

## Source Authority

When sources conflict, use this priority:

1. Explicit user decisions
2. `/docs` product/business requirements
3. `/specs` defined system behavior
4. `/ui_ux/vision` design direction
5. `/backend` implementation reality
6. Your own inference

Never silently resolve a meaningful conflict through inference.

If a conflict affects UX decisions, ask the user.

---

# Workflow

Follow this workflow in order.

## 1. Discover

Inspect the relevant project sources.

Identify:

* Product purpose
* User roles
* Main user goals
* Important user activities
* Business rules affecting UX
* Important system states
* Permissions and visibility
* Existing UX Vision documents
* Mobile Web constraints

Do not generate the final document yet.

---

## 2. Analyze

Translate the discovered product behavior into UX implications.

Focus on questions such as:

* What does each user type need to accomplish?
* What are their most important activities?
* What information do they need to make decisions?
* Which actions are frequent?
* Which actions are important or high-impact?
* Which states must be clearly communicated?
* Which business rules can affect the user's experience?
* Which information should be visible to which role?
* Where can users become confused or blocked?
* Which parts of the product require especially clear feedback?

Think in terms of **user experience**, not implementation.

---

## 3. Incorporate UX Vision

Use `/ui_ux/vision` to identify the intended design direction.

Extract only meaningful UX implications such as:

* Navigation expectations
* Interaction patterns
* Information hierarchy
* Content organization
* Important UX patterns
* Mobile interaction expectations
* Design principles explicitly requested by the user

Do not turn visual references into product requirements.

If a visual reference suggests something that is not supported by the product requirements, treat it as an open question rather than a new feature.

---

## 4. Identify Ambiguities and Conflicts

Before producing the final UX Foundation, identify issues such as:

* Missing UX decisions
* Conflicting requirements
* Conflicting design directions
* Unclear role behavior
* Unclear information visibility
* Unclear state transitions
* Important UX behavior that cannot be determined from the sources

Ask the user about decisions that materially affect the UX.

Do not silently invent decisions.

Minor details that can safely be deferred may be recorded as open questions instead of interrupting the workflow.

---

## 5. Generate UX Foundation

After the important decisions are resolved, create:

`/ui_ux/ux-foundation.md`

The document should describe the UX foundation of the product without designing individual screens.

Use the following structure.

```markdown
# UX Foundation

## 1. Product Context

### Product
...

### Platform
...

### Primary Users
...

### Product Goal
...

---

## 2. UX Goals

- ...
- ...
- ...

---

## 3. User Roles & Needs

### [Role]

**Goals**
- ...

**Needs**
- ...

**Key Activities**
- ...

**UX Considerations**
- ...

---

## 4. Core User Journeys

### [Journey]

**User**
...

**Goal**
...

**Starting Point**
...

**Key Steps**
1. ...
2. ...
3. ...

**Important UX Considerations**
- ...

---

## 5. Information Needs

Identify the important information users need to see, understand, create, or act upon.

### [Information Area]

- ...
- ...
- ...

---

## 6. UX-Relevant States

Identify system states that require meaningful user feedback or different UX treatment.

### [State]

**Meaning**
...

**User Impact**
...

**UX Consideration**
...

---

## 7. Permissions & Visibility

Describe UX-relevant differences in what users can access, see, or act upon.

### [Role]

- Can see: ...
- Can act on: ...
- Cannot see/act on: ...

---

## 8. UX Principles

- ...
- ...
- ...

These principles should guide later IA, user flows, screen specifications, and UI design.

---

## 9. Mobile UX Constraints

Describe the important constraints created by the Mobile Web context.

Focus on UX implications rather than implementation details.

- ...
- ...
- ...

---

## 10. UX Implications

Capture important conclusions that should influence later UX phases.

- ...
- ...
- ...

---

## 11. Open Questions

Only include unresolved questions that may affect future UX decisions.

- ...
- ...
- ...
```

---

# Scope

This skill MAY define:

* User goals
* User needs
* Core journeys
* Information needs
* UX principles
* UX-relevant states
* Role-based visibility
* UX constraints
* UX implications
* Important unresolved UX questions

This skill MUST NOT define:

* Individual screen designs
* Detailed Information Architecture
* Detailed User Flows
* Wireframes
* High-fidelity UI
* Design system
* Component library
* CSS
* Vue components
* Frontend architecture
* Backend architecture
* Specific frontend libraries

Those belong to later phases.

---

# Interaction Rules

This skill is interactive.

Do not silently make meaningful product or UX decisions.

When a decision is required:

1. Explain the relevant context briefly.
2. Present the actual decision that needs to be made.
3. Give concise options when appropriate.
4. Ask the user to decide.
5. Continue after the decision.

Do not create a separate approval file or decision registry.

Decisions should be resolved naturally during the interaction and then reflected in `ux-foundation.md`.

---

# Quality Rules

Before finishing, verify that:

* UX Foundation is based on actual product requirements.
* User roles and goals are correctly represented.
* Important business rules affecting UX are captured.
* Important system states are represented.
* Role-based visibility is not accidentally exposed.
* UX Vision has been incorporated without turning visual references into new requirements.
* Mobile Web is treated as the primary UX context.
* No implementation decisions have leaked into the document.
* No screen-level design has been prematurely defined.
* Meaningful ambiguities were discussed with the user.
* Open questions are limited to genuinely unresolved UX issues.
* The document provides a useful foundation for the next UX phases.

The final document should be concise enough to remain useful to future AI agents.

Do not add sections merely for completeness.
Do not over-document obvious information.
Do not invent requirements.
