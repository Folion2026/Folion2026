# FOLION CV PACKAGE — GOLDEN MASTER

This package defines the approved 2-page maximum CV output direction.

## Core workflow

1. User enters a CV Package Brief describing what the CVs are being created for.
2. User clicks `Match Best`.
3. Folion ranks all active studio people from strongest to weakest match.
4. User selects the people they want to export.
5. User clicks `Match Projects`.
6. Folion selects only the most relevant projects for each selected person.
7. User clicks `Create CV Package`.
8. Folion generates a maximum 2-page CV per person.

## Match Best rules

Ranking may use only:
- approved person profile
- approved expertise
- qualifications
- registrations / affiliations
- years of experience
- explicit Person → Project → Role relationships
- approved project knowledge

Do not infer project experience.
Do not include deleted people.
Do not show percentage scores in the final CV output.

## Match Projects rules

For each selected person, Folion may only consider projects with an explicit:
Person → Project → Role relationship.

Then rank those projects against the CV Package Brief.

The final CV should contain only the strongest relevant evidence required to fit elegantly within 2 pages.

Do not squeeze more projects in.
Remove weaker evidence instead.

## Page 1 — Person Profile

Content:
- firm logo / identity
- optional package / opportunity title
- person name
- position / title
- optional portrait
- 80–120 word opportunity-specific profile
- years of experience
- qualifications
- registrations / affiliations
- 4–6 relevant expertise areas
- current role / employment

The opportunity-specific profile must be generated only from approved person and project-role data.

## Page 2 — Relevant Experience

For each selected project:
- project name
- location / year where useful
- explicit role
- concise person-specific contribution

Contribution must be grounded in:
Person → Project → Explicit Role → Approved Project Knowledge.

Never infer a person's project role.

The number of projects is flexible.
Use only as many as fit elegantly within the 2-page maximum.

## Optional selection note

A short note may explain why the selected projects are relevant to the CV Package Brief.
This should be generated from approved evidence only.

## Branding

Dynamic footer:
- Use firm logo from Folion ID / Brand Kit.
- Do not hardcode any example firm.
- If no logo exists, fall back to firm name text.
- Keep `Generated with FOLION` subtle on the opposite side.
- Use firm brand colour only as a restrained accent.

## Visual rules

- A4 portrait
- Maximum 2 pages per person
- Text-led
- Premium senior-practice credential
- Generous whitespace
- Strong name hierarchy
- Minimal rules
- No heavy tables
- No dense project lists
- No SaaS cards
- No unnecessary project imagery
- Optional small portrait only

## Codex implementation sequence

### Phase 1 — Static implementation
1. Add this exact reference to a development/reference route.
2. Preserve both page types:
   - Profile
   - Relevant Experience
3. Do not connect live data yet.
4. Render both pages at exact A4 portrait dimensions.
5. Return screenshots for visual approval.
6. Do not reinterpret the design.

### Phase 2 — Dynamic integration
Only after static approval:
1. Connect CV Package Brief.
2. Implement `Match Best`.
3. Rank active people strongest → weakest.
4. Allow user selection.
5. Implement `Match Projects`.
6. Match only explicit person-project-role relationships.
7. Generate opportunity-specific profile.
8. Generate role-specific project contribution copy.
9. Enforce maximum 2-page output.
10. Connect firm logo and Brand Kit.
11. Preserve PDF export.
12. Persist relevant saved package state after reload.

## Acceptance principle

The system must curate content to protect the 2-page maximum.
When content exceeds the design capacity, reduce weaker evidence rather than compressing typography or spacing.
