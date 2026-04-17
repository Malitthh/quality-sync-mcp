Raise a bug ticket in Jira. $ARGUMENTS

Parse the argument to extract bug details. The argument format is flexible — the user may provide:
- Just a short description: "booking confirmation email not sent"
- Description + severity: "login fails on mobile HIGH"
- Description + module: "Bookings: filter not working after pagination"

If the argument does not contain enough detail, ask the user for:
1. Steps to reproduce (numbered)
2. Expected result
3. Actual result
4. Severity (Critical/High/Medium/Low — refer to CLAUDE.md for the guide)
5. Affected user type (admin/merchant/customer)

If Chrome is open and the bug is still visible in the browser, take a screenshot first.

Then use jira_create_bug to create the ticket with:
- Project key: from CLAUDE.md
- Full structured description
- Correct priority based on severity
- Environment: QA
- Relevant labels

After creating, output the ticket key and URL so the user can navigate directly to it.
