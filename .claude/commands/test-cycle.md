Create a QMetry test cycle, test plan, or pull test report results. $ARGUMENTS

## Naming convention
Follow the existing pattern from QMetry exactly:
  (Platform) - Module/Flow Name – Type
  Examples:
    (Merchant Platform) - Merchant Onboarding Flow – E2E Functional Validation
    (Admin Platform) - Bookings Module – Regression
    (Admin Platform) - Authentication & Login – Smoke

## Step 1 — Understand what the user wants

Parse the argument to determine the action:

CREATE CYCLE:
  "create cycle [module] [type]"
  "new cycle [module] [type]"
  → Use qmetry_create_test_cycle

CREATE PLAN:
  "create plan [name]"
  "new test plan [name]"
  → Use qmetry_create_test_plan

GET RESULTS / TEST REPORT:
  "results [cycle key]"
  "report [cycle key]"
  "report for AUT-TR-1"
  → Use qmetry_get_cycle_results then format a clean report

## Step 2 — Determine which TCs to include

When creating a cycle, TCs can come from two sources:

SOURCE A — Module folder (default, no TC keys given):
  If user says "create cycle Bookings Module regression" with no TC keys:
  - Use qmetry_get_test_cases with folder_path matching the module
  - Map module name to folder path:
      Authentication & Login  → Admin Platform/Authentication & Login
      Dashboard Module        → Admin Platform/Dashboard Module
      Merchants Module        → Admin Platform/Merchants Module
      Bookings Module         → Admin Platform/Bookings Module
      Calendar Module         → Admin Platform/Calendar Module
      Reviews Module          → Admin Platform/Reviews Module
      Merchants Platform      → Merchants Platform
  - Fetch all TCs from that folder and include all of them in the cycle
  - Tell the user: "Found X TCs in [folder]. Creating cycle with all of them."

SOURCE B — Specific TC keys (user provides them):
  If user says "create cycle Bookings regression AUT-TC-84,AUT-TC-85,AUT-TC-92":
  - Use exactly those TC keys
  - Tell the user: "Creating cycle with X specified TCs."

## Step 3 — Create the cycle

Use qmetry_create_test_cycle with:
- project_key: AUT
- name: formatted following the naming convention above
- folder_path OR tc_keys depending on source above
- Assign to the user from CLAUDE.md by default
- planned_start_date: today
- planned_end_date: ask user if not provided, or default to +7 days

## Step 4 — Create a test plan (if requested)

If user asks for a test plan:
- Use qmetry_create_test_plan
- Link the newly created cycle(s) to the plan
- Name pattern: (Platform) – [Sprint or Release Name] Test Plan

## Step 5 — Generate test report (if requested)

If user asks for results or a report for an existing cycle:
- Use qmetry_get_cycle_results to fetch execution data
- Format output as:

  Test Cycle: [key] — [name]
  Status: [status]
  
  Execution Summary:
  | Result      | Count | Percentage |
  |-------------|-------|------------|
  | Pass        | X     | X%         |
  | Fail        | X     | X%         |
  | Blocked     | X     | X%         |
  | Not Executed| X     | X%         |
  | Total       | X     | 100%       |
  
  Failed TCs:
  - [key] — [summary]
  
  Blocked TCs:
  - [key] — [summary]

After generating results, ask: "Would you like me to create a Confluence page with this report?"
If yes, use the confluence command logic to create it under Test Summary Reports.
