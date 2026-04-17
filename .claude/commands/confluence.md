Create or update a Confluence page in the Autara space. $ARGUMENTS

## Space structure
Space key: AUTARA (or as defined in CLAUDE.md)
Root: Quality & Release Management

Exact sub-sections and what belongs in each:

- Test & Release Strategy
  test strategy docs, release strategy, overall testing approach

- Test Coverage by Platforms
  platform coverage docs, coverage matrices, what is and is not tested per platform

- Cross-Team Knowledge Sharing
  onboarding guides, team permissions, tool access docs, guides for new QEs and devs
  Existing example: "Onboarding Guide for New QEs and Devs at Autara: Team, Tools, and Permissions."

- Test Design, Implementation & Quality Practices
  test case design guidelines, shift-left docs, quality standards, implementation practices
  Existing examples:
    "Shift-Left Approach: Early Test Design & Implementation in Software Development Lifecycle"
    "Guidelines for Creating High Quality Test Cases in Autara."

- Test Summary Reports
  sprint test reports, functional and usability testing summaries, module-level test reports
  Existing example: "Test Summary Report of Functional & Usability Testing -Merchant Platform - Merchant Onboarding"

- Release Management
  release notes, deployment checklists, go/no-go sign-off, hotfix records, version summaries

- User Centric Competitive Analysis: Extracting Functional & UX Learnings
  competitor app research, UX findings, feature comparisons
  Existing examples:
    "HelaGo App Research: Identifying Critical Issues in User Experience"
    "PickMe App Research: Identifying Critical Issues in User Experience"
    "Uber App Research: Identifying Critical Issues in User Experience"
    "Fresha App Research: What They Get Right and What Needs Fixing"
    "Vagaro App Research: Shared Best Practices with Fresha and Weaknesses Worth Noting"

## Step 1 — Determine the correct parent section

Map the user request to the right section:

test report, sprint report, usability report            → Test Summary Reports
test strategy, release strategy, testing approach       → Test & Release Strategy
coverage doc, platform coverage, coverage matrix        → Test Coverage by Platforms
test case guidelines, quality practices, shift-left     → Test Design, Implementation & Quality Practices
onboarding guide, team guide, tool access, permissions  → Cross-Team Knowledge Sharing
release notes, deployment checklist, go/no-go, hotfix   → Release Management
competitor research, app research, UX analysis          → User Centric Competitive Analysis: Extracting Functional & UX Learnings

If the request is ambiguous, show the list above and ask the user which section applies before proceeding.

## Step 2 — Check for existing pages in that section

Use confluence_get_page to search for existing pages in the target section using relevant title keywords.

If a similar page exists:
- Fetch it and examine its structure — headings, sections, tables, naming pattern
- Use that exact structure as the template for the new page
- Match the title format exactly (e.g. if existing reports say "Test Summary Report of Functional & Usability Testing - [Platform] - [Module]", follow the same pattern)

If no similar page exists:
- Tell the user: "I did not find an existing page to use as a pattern for [page type]. Here is what I would include — let me know if you want to add or change anything before I create it:"
- Propose a clear structure with headings and sections
- Wait for the user to confirm or adjust before creating

## Step 3 — Create or update the page

When creating a new page:
- Use confluence_create_page with the correct parent section
- Follow the naming convention found in existing pages in that section
- Always include: tester name from CLAUDE.md, today's date, relevant ticket or sprint references
- Test reports: total TCs, pass/fail counts, list of tested tickets, bugs raised, blockers, sign-off
- Release notes: version, date, what changed, known issues, sign-off status
- Research docs: app name, date, key findings structured as issues or highlights

When updating an existing page:
- Use confluence_get_page to locate it by title first
- Use confluence_update_page — append by default unless the user says to replace

## Step 4 — Output the result

After creating or updating, always output:
- Page title
- Direct URL to the page
- Which section it was created under