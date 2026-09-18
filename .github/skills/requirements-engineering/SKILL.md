---
name: requirements-engineering
description: 'Guide collaborative requirements engineering from a raw product idea to clear, consistent, testable, and traceable requirements. Use for product discovery, PRDs, user stories, functional and non-functional requirements, scope definition, acceptance criteria, assumptions, open questions, and requirements validation.'
argument-hint: 'Provide the product idea, existing notes, or PRD to analyze and refine.'
user-invocable: true
---

# Requirements Engineering Skill

## Purpose

This skill guides an AI agent through a practical Requirements Engineering process.

The agent starts from a raw product idea, typically consisting of a title and a short description, and works collaboratively with the user to discover, clarify, structure, refine, and validate the requirements.

The goal is not to generate as many requirements as possible. The goal is to produce a clear, consistent, testable, and traceable set of requirements that accurately represents the user's needs without inventing unspecified behavior.

This skill is intentionally lightweight. Do not introduce unnecessary processes, documents, folders, or ceremony unless the project genuinely requires them.

---

# 1. Core Principles

## 1.1 User Intent Is the Source of Truth

Requirements must be based on information provided or explicitly confirmed by the user.

Do not invent requirements, business rules, actors, constraints, policies, workflows, or system behavior.

When information is missing, ask the user or explicitly record it as an open question.

---

## 1.2 Separate Facts, Assumptions, Decisions, and Requirements

Maintain a clear distinction between:

### Fact

Information explicitly provided or confirmed by the user.

### Assumption

An interpretation or assumption made because information is missing.

Assumptions must never silently become requirements.

### Decision

A question or ambiguity that has been resolved by the user.

### Requirement

A confirmed statement describing something the system must do or a property it must have.

---

## 1.3 Do Not Guess

When an important detail is unknown, do not silently choose an answer.

Instead:

1. Identify the ambiguity.
2. Assess whether it affects the requirements.
3. Ask a focused question when clarification is necessary.
4. Record the answer once confirmed.

If a decision is genuinely not required yet, leave it unresolved.

---

## 1.4 Discovery Before Specification

Do not prematurely define:

* database schemas
* API endpoints
* classes
* modules
* frameworks
* libraries
* infrastructure
* implementation details
* specific technologies

Requirements Engineering describes **what the system needs to do and why**.

Solution design belongs to later stages.

---

## 1.5 Ask Focused Questions

Do not overwhelm the user with a large questionnaire.

Ask the smallest useful set of questions needed to resolve the most important current uncertainties.

Prefer:

* one focused question
* or a small group of closely related questions

over a long list of unrelated questions.

Prioritize questions that can significantly change the scope, actors, requirements, workflows, or business rules.

---

## 1.6 Work Incrementally

Do not wait until the entire product is understood before recording information.

As confirmed information becomes available:

* update the relevant artifacts
* refine existing requirements
* identify newly discovered dependencies
* update open questions
* check for conflicts

Requirements should evolve incrementally.

---

## 1.7 Preserve User Decisions

Once the user explicitly confirms a requirement or decision, preserve it unless the user changes it later.

Do not repeatedly ask questions that have already been resolved.

---

## 1.8 Detect Conflicts

If new information conflicts with a previous confirmed decision, do not silently overwrite the previous decision.

Explicitly identify the conflict and ask the user which behavior should apply.

---

## 1.9 Validate Continuously

Validation is not only a final step.

Whenever meaningful new information is added, check whether it creates:

* ambiguity
* inconsistency
* duplication
* missing dependencies
* conflicting business rules
* invalid assumptions
* affected requirements

A final validation pass is still required before declaring the Requirements Package complete.

---

## 1.10 Keep the Repository Clean

Only store useful, current project artifacts in the repository.

Do not create files for:

* every conversation
* internal reasoning
* temporary thoughts
* intermediate agent messages
* unnecessary analysis logs

The repository should represent the current requirements state, not the agent's conversation history.

---

# 2. Workflow

The workflow is iterative rather than strictly linear.

The main flow is:

Raw Idea
→ Understanding
→ Discovery
→ Scope
→ Actors & Goals
→ Requirements
→ Business Rules
→ User Stories & Acceptance Criteria
→ Edge Cases
→ Non-Functional Requirements
→ Validation
→ Requirements Package

The agent may return to an earlier stage whenever new information reveals missing or conflicting requirements.

---

# 3. Initial Input — Raw Idea

The expected initial input is usually:

* Title
* Short description

The description may be only one or two paragraphs.

At this stage, treat the input as a product idea, not as a complete requirements specification.

---

# 4. Phase 1 — Understand the Idea

First determine what is explicitly known.

Identify:

* the problem or opportunity
* the product's apparent purpose
* explicitly mentioned users
* explicitly mentioned capabilities
* important domain concepts
* obvious uncertainties

Internally distinguish:

* Known facts
* Potential assumptions
* Unknowns
* Questions that may materially affect the product

Do not immediately generate a large requirements document.

### Initial response behavior

The agent should briefly demonstrate its understanding and then begin discovery.

For example:

> I understand the product as follows: ...
>
> Before defining the requirements, I need to clarify a few important aspects.

Do not expose internal reasoning or hidden chain-of-thought.

---

# 5. Phase 2 — Discovery

The purpose of Discovery is to obtain enough information to define meaningful requirements.

Explore the following areas as needed:

## 5.1 Problem and Purpose

Clarify:

* What problem does the system solve?
* Why is it needed?
* What outcome is expected?

Do not over-investigate business strategy if it does not affect the software requirements.

---

## 5.2 Users and Actors

Identify:

* who uses the system
* who performs actions
* who receives results
* external systems or parties that interact with the system

Do not assume roles merely because they are common in similar products.

---

## 5.3 Goals

Understand what each important actor wants to achieve.

Focus on meaningful goals rather than implementation steps.

---

## 5.4 Core Capabilities

Identify the core things the system needs to enable.

For example:

* create something
* view something
* update something
* perform an action
* submit something
* approve something
* purchase something
* receive something

Do not turn every sentence into a requirement automatically.

---

## 5.5 Scope

Determine:

### In Scope

Capabilities that belong to the current product.

### Out of Scope

Capabilities explicitly excluded from the current product.

If the scope is unclear and the ambiguity materially affects the project, ask the user.

---

## 5.6 Business Rules

Identify rules that govern behavior.

Examples:

* eligibility rules
* limits
* permissions
* calculations
* conditions
* policies
* state restrictions

Business rules should remain separate from functional requirements.

---

## 5.7 Important Constraints

Identify relevant constraints such as:

* regulatory
* organizational
* business
* timing
* existing-system
* technical constraints explicitly imposed by the user

Do not introduce technical constraints unless they actually exist.

---

## 5.8 Unknowns

Maintain a list of important unresolved questions.

Only questions that can affect the product should be tracked.

Do not create an exhaustive list of trivial unknowns.

---

# 6. Discovery Question Strategy

When deciding what to ask next, prioritize questions using this order:

1. Questions that can change product scope
2. Questions that can change actors or permissions
3. Questions that can change core workflows
4. Questions that can change business rules
5. Questions that affect important edge cases
6. Questions needed for testability
7. Lower-impact details

Do not ask questions merely because they are possible to ask.

---

# 7. Phase 3 — Scope

Once enough information is available, establish the current scope.

Maintain:

* In Scope
* Out of Scope

If the user mentions future ideas, do not automatically include them in the current scope.

Record them as out-of-scope or future considerations when appropriate.

Do not create a separate roadmap unless the user asks for one.

---

# 8. Phase 4 — Actors and Goals

Identify confirmed actors and their goals.

For each actor, capture only information that is useful to the requirements.

Example structure:

```text
Actor: Teacher

Goals:
- Award points to students
- Review awarded points
```

Do not infer permissions solely from the actor's name.

An actor's role and permissions must be based on confirmed requirements.

---

# 9. Phase 5 — Functional Requirements

Create functional requirements once there is enough information to describe system behavior clearly.

Each requirement should:

* describe one meaningful behavior or capability
* be clear
* be unambiguous
* be testable
* avoid unnecessary implementation details
* represent confirmed user intent

Use stable identifiers:

```text
FR-001
FR-002
FR-003
```

Do not renumber existing requirements unnecessarily.

### Requirement wording

Prefer:

> The system shall allow a teacher to award points to a student.

Avoid vague wording such as:

> The system should make point management easy.

Avoid implementation-specific wording such as:

> The system shall use a PostgreSQL table for points.

---

# 10. Requirement Status

A requirement may have one of these statuses:

### Draft

Identified but still subject to clarification or refinement.

### Confirmed

Explicitly accepted or confirmed by the user.

Do not mark a requirement as Confirmed merely because the agent believes it is reasonable.

---

# 11. Phase 6 — Business Rules

Business rules describe policies and constraints governing the domain.

Use stable identifiers:

```text
BR-001
BR-002
BR-003
```

Examples:

```text
BR-001
A student cannot spend more points than their available balance.
```

Keep business rules separate from functional requirements.

A requirement may state that a capability exists, while a business rule defines the conditions under which it operates.

---

# 12. Phase 7 — User Stories

Create User Stories from confirmed user needs.

Use:

```text
As a [actor],
I want [capability],
so that [value].
```

Use stable identifiers:

```text
US-001
US-002
```

A User Story should represent a meaningful user goal.

Do not create stories for trivial technical implementation tasks.

---

# 13. Acceptance Criteria

Each meaningful User Story should have testable Acceptance Criteria.

Use concise Given / When / Then scenarios when appropriate.

Example:

```text
Given a student has 100 points
When the student purchases a reward costing 50 points
Then the student's balance becomes 50 points
```

Acceptance Criteria should describe observable behavior.

They should not prescribe implementation unless implementation is itself a confirmed requirement.

---

# 14. Phase 8 — Edge Cases and Exceptions

After the main behavior is understood, identify important alternative and failure scenarios.

Consider:

* invalid input
* insufficient resources
* unauthorized actions
* missing entities
* unavailable resources
* duplicate operations
* boundary values
* conflicting state
* failed external dependencies
* unusual but realistic user behavior

Do not enumerate every theoretical failure.

Focus on cases that are relevant to the product or that could materially affect behavior.

When expected behavior is unknown, create an Open Question instead of inventing the behavior.

---

# 15. Phase 9 — Non-Functional Requirements

Identify relevant Non-Functional Requirements only when they matter to the product.

Possible categories include:

* Performance
* Security
* Reliability
* Availability
* Scalability
* Maintainability
* Accessibility
* Observability
* Privacy
* Localization
* Compliance

Use stable identifiers:

```text
NFR-001
NFR-002
```

Do not invent arbitrary numerical targets.

For example, do not choose:

> The API must respond within 200 ms.

unless the user or a legitimate project constraint provides that target.

If a target is required but unknown, record it as an Open Question.

---

# 16. Assumptions

Track assumptions separately from confirmed requirements.

An assumption is acceptable only when it helps the process continue without pretending that it is confirmed.

Example:

```text
A-001
It is assumed that each student has a unique account.
```

If an assumption materially affects the product, ask the user to confirm it.

Once confirmed, convert the relevant assumption into a confirmed decision or requirement and remove or update the assumption.

Avoid creating assumptions unnecessarily.

---

# 17. Decisions

Important decisions made by the user should be preserved.

Example:

```text
D-001
Decision:
Teachers may award points but may not remove previously awarded points.

Source:
User confirmation during requirements discovery.
```

Decisions are especially useful when they explain why a requirement or business rule exists.

Do not record every conversational statement as a decision.

Only preserve meaningful decisions that affect the product.

---

# 18. Open Questions

Any unresolved requirement-level question should be recorded.

Use stable identifiers:

```text
Q-001
Q-002
```

Each question should contain:

```text
Question:
...

Why it matters:
...

Status:
Open
```

When the user answers:

1. Update the relevant requirement artifacts.
2. Mark the question as resolved or remove it from the active Open Questions section.
3. Check whether the answer affects existing requirements, rules, stories, or acceptance criteria.

Do not leave resolved questions active.

---

# 19. Handling Suggestions

The agent may identify useful possibilities that the user has not specified.

These must be clearly labeled as suggestions.

Example:

> Suggestion: It may be useful to maintain an audit history of point transactions. Would you like this to be a requirement?

A suggestion becomes a requirement only after user confirmation.

Never silently convert suggestions into requirements.

---

# 20. Handling Changes

When the user changes an existing requirement or decision:

1. Identify the affected artifact.
2. Update the artifact.
3. Identify related requirements, rules, stories, or acceptance criteria.
4. Check those artifacts for inconsistencies.
5. Update affected artifacts.
6. If the change introduces an unresolved decision, create an Open Question.

Do not preserve obsolete requirements as active requirements.

If historical tracking is needed, rely on Git rather than creating additional requirement-history files.

---

# 21. Traceability

Maintain lightweight traceability.

Use references between related artifacts where useful.

Typical relationships are:

```text
Goal
  ↓
Requirement
  ↓
User Story
  ↓
Acceptance Criteria
  ↓
Business Rule
```

Do not build a complicated traceability database.

Simple identifiers and references are sufficient.

Example:

```text
FR-003
Related:
US-002
BR-001
```

The goal is to make relationships understandable to humans and AI agents.

---

# 22. Requirements Validation

Before considering the Requirements Package complete, perform a validation pass.

Check every requirement for:

### Clarity

Can a developer and stakeholder interpret it the same way?

### Unambiguity

Does it have only one reasonable interpretation?

### Completeness

Are important aspects of the behavior defined?

### Consistency

Does it conflict with another requirement or business rule?

### Necessity

Does it represent an actual product need?

### Feasibility

Is it realistically achievable within known constraints?

### Testability

Can its behavior be verified?

### Atomicity

Does it describe one meaningful requirement rather than several unrelated requirements?

### Traceability

Can it be connected to a relevant user goal, actor, or business need?

---

# 23. Validation Issues

If validation identifies a problem, do not hide it.

Record the issue and resolve it through refinement or user clarification.

Examples:

```text
V-001
Type: Ambiguity
Related: FR-003
Issue:
The requirement does not define who is allowed to perform the action.
Status:
Open
```

Validation issues do not need a permanent dedicated file.

They may remain in the working state during the session and be resolved before finalization.

---

# 24. Completion Criteria

The Requirements Engineering process can be considered complete when:

* the product purpose is sufficiently understood
* the current scope is clear
* important actors are identified
* important goals are understood
* core functional requirements are defined
* relevant business rules are defined
* meaningful user stories exist
* acceptance criteria are testable
* important edge cases are addressed
* relevant non-functional requirements are defined
* assumptions are explicit
* important decisions are recorded
* no critical open questions remain
* significant conflicts have been resolved
* requirements have passed validation

Not every project needs every artifact.

The agent should use judgment and avoid producing unnecessary documentation.

---

# 25. Repository Structure

Requirements must be maintained in:

```text
docs/
└── requirements/
    ├── README.md
    ├── requirements.md
    ├── user-stories.md
    ├── business-rules.md
    └── open-questions.md
```

Do not create additional requirement directories unless there is a clear project-specific need.

---

# 26. Requirements Storage

## 26.1 `README.md`

Provides a short overview of the Requirements Package.

It should explain:

* what the product is
* what this directory contains
* the current requirements status
* important navigation information if necessary

Keep it short.

---

## 26.2 `requirements.md`

This is the main requirements document.

Recommended structure:

```markdown
# Requirements

## Context

## Goals

## Scope

### In Scope

### Out of Scope

## Actors

## Functional Requirements

### FR-001 — ...

**Status:** Confirmed

**Description:**
...

**Related:**
US-001, BR-001

## Non-Functional Requirements

### NFR-001 — ...

**Status:** Confirmed

**Category:** Security

**Description:**
...

## Assumptions

### A-001

...

## Decisions

### D-001

...

## Constraints

### C-001

...
```

Only include sections that are relevant.

Do not create empty sections simply to satisfy a template.

---

# 27. `user-stories.md`

Recommended structure:

```markdown
# User Stories

## US-001 — ...

**Actor:** ...

**Story:**

As a ...
I want ...
so that ...

### Acceptance Criteria

#### Scenario 1

Given ...
When ...
Then ...

**Related Requirements:**
FR-001

**Related Business Rules:**
BR-001
```

Keep User Stories focused on user goals.

Do not duplicate the complete functional requirements unnecessarily.

---

# 28. `business-rules.md`

Recommended structure:

```markdown
# Business Rules

## BR-001 — ...

**Rule:**
...

**Reason / Context:**
...

**Related Requirements:**
FR-001

**Related User Stories:**
US-001
```

The Reason / Context section is optional.

Keep the file focused on actual domain rules.

---

# 29. `open-questions.md`

Recommended structure:

```markdown
# Open Questions

## Q-001 — ...

**Question:**
...

**Why it matters:**
...

**Status:** Open

**Related:**
FR-003
```

When a question is resolved, update the affected artifacts and remove the question from the active Open Questions list.

Do not accumulate resolved questions indefinitely.

---

# 30. Artifact Ownership

The following information should be persisted in the repository when relevant:

| Information                      | Store in Repository? |
| -------------------------------- | -------------------- |
| Product context                  | Yes                  |
| Goals                            | Yes                  |
| Scope                            | Yes                  |
| Actors                           | Yes                  |
| Functional Requirements          | Yes                  |
| Non-Functional Requirements      | Yes                  |
| User Stories                     | Yes                  |
| Acceptance Criteria              | Yes                  |
| Business Rules                   | Yes                  |
| Important Assumptions            | Yes                  |
| Important Decisions              | Yes                  |
| Active Open Questions            | Yes                  |
| Temporary agent reasoning        | No                   |
| Full conversation history        | No                   |
| Temporary analysis               | No                   |
| Internal chain-of-thought        | No                   |
| Resolved temporary questions     | No                   |
| Duplicate/intermediate artifacts | No                   |

The repository represents the **current source of truth** for requirements.

Conversation is the mechanism used to discover and refine that source of truth.

---

# 31. Agent State

The agent should maintain a lightweight working state during the process.

Conceptually:

```text
Idea
Facts
Actors
Goals
Scope
Requirements
Business Rules
User Stories
Acceptance Criteria
Edge Cases
NFRs
Assumptions
Decisions
Open Questions
Validation Issues
```

This state does not need to become a separate repository file.

Use the repository artifacts as the persistent state and the conversation context as temporary working state.

---

# 32. Phase Management

The agent should know its current phase.

Possible phases:

```text
UNDERSTANDING
DISCOVERY
SCOPE
ACTORS_AND_GOALS
REQUIREMENTS
BUSINESS_RULES
USER_STORIES
EDGE_CASES
NON_FUNCTIONAL_REQUIREMENTS
VALIDATION
COMPLETE
```

The phases are not strict barriers.

The agent may move backward when new information requires refinement.

---

# 33. When to Move Forward

Move to the next relevant phase when:

* enough information is available for the current phase
* remaining unknowns do not block meaningful progress
* requirements can be expressed without guessing

Do not wait for perfect information.

Requirements Engineering is iterative.

---

# 34. When to Move Backward

Return to an earlier phase when:

* a new actor is discovered
* scope changes
* a business rule conflicts with a requirement
* a requirement exposes a missing workflow
* a new decision affects existing requirements
* validation reveals missing information
* the user changes an earlier decision

After returning to an earlier phase, update affected artifacts and continue forward again.

---

# 35. Conversation Behavior

During the interactive process, the agent should:

1. Briefly acknowledge the latest information.
2. Update its understanding.
3. Identify what remains important to clarify.
4. Ask the next focused question(s), or
5. Produce/update relevant artifacts when enough information is available.

Do not repeatedly summarize the entire project after every user response.

Prefer concise progress updates.

---

# 36. Avoid Over-Engineering

This skill intentionally avoids unnecessary complexity.

Do not automatically introduce:

* dozens of documents
* elaborate requirement taxonomies
* UML diagrams
* BPMN diagrams
* formal matrices
* complex metadata
* requirement databases
* custom DSLs
* elaborate status systems
* separate files for every requirement
* separate files for every actor
* separate files for every business rule

Introduce additional structure only when the project size or complexity clearly justifies it.

---

# 37. Separation from Later Engineering Phases

This skill ends at validated requirements.

The expected overall engineering flow is:

```text
Raw Idea
    ↓
Requirements Engineering
    ↓
Validated Requirements
    ↓
Specification
    ↓
Architecture
    ↓
Design
    ↓
Implementation
    ↓
Testing
```

Do not perform the later phases unless explicitly requested or another skill/process takes over.

In particular, Requirements Engineering should not silently become:

* API Design
* Database Design
* Software Architecture
* Coding
* Infrastructure Design

---

# 38. Final Requirements Package

When the requirements are sufficiently mature and validation passes, ensure the repository contains:

```text
docs/
└── requirements/
    ├── README.md
    ├── requirements.md
    ├── user-stories.md
    ├── business-rules.md
    └── open-questions.md
```

The final package should be:

* understandable by stakeholders
* usable by developers
* usable by AI agents
* testable
* internally consistent
* free of unsupported assumptions
* clear about unresolved decisions

The agent should explicitly state if important requirements remain unresolved rather than claiming completeness.

---

# 39. Final Principle

The agent's job is not to decide what the product should be.

The agent's job is to help the user discover, clarify, structure, and validate what the product should be.

When information is missing:

```text
Ask.
```

When information is ambiguous:

```text
Clarify.
```

When information conflicts:

```text
Surface the conflict.
```

When information is confirmed:

```text
Record it.
```

When requirements change:

```text
Propagate and revalidate the impact.
```

When requirements are complete:

```text
Preserve them as a clean source of truth.
```
