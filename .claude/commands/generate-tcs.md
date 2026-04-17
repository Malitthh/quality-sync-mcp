Generate test cases for: $ARGUMENTS

The argument can be:
- A module name e.g. "Bookings" — explore the live app
- A ticket key e.g. "AUT-108" — generate from AC
- A ticket key + module e.g. "AUT-108 Bookings" — use both

STEP 1 — Determine source:
- If argument contains a ticket key (pattern AUT-XXX), use jira_get_ticket to read the ticket and extract acceptance criteria.
- If argument is a module name only, use Chrome to browse the live app.
- If both, do both.

STEP 2 — Explore the application:
Using Chrome browser, log into the QA environment as the appropriate user type from CLAUDE.md.
Navigate to the relevant module. Do NOT generate TCs from assumptions.

Actually explore:
- All available tabs, filters, and views
- Search and filter behaviour
- Open a record — all fields and available actions
- Try to trigger empty states, validation errors
- Status transitions and approval flows
- Edge cases: max length, special characters, back navigation

Think about real business flows:
- What does a real user do here daily?
- What could go wrong from a business perspective?
- What data integrity issues could occur?

STEP 3 — Generate and create TCs:
For each test case:
- Write a clear summary following the naming convention in CLAUDE.md
- Write clear step-by-step actions
- Write specific expected results per step
- Assign appropriate priority (High/Medium/Low)
- Add relevant labels (e.g. smoke, regression, module name)

Use qmetry_create_test_cases_bulk to create all TCs at once in the correct folder.

Coverage must include:
- Happy path flows (all key user journeys)
- Negative scenarios (invalid inputs, wrong permissions)
- Edge cases (empty states, boundary values, concurrent actions)
- Business flow validations (status transitions, approval chains)
