Retest the following Jira tickets: $ARGUMENTS

Follow these steps for EACH ticket in the list:

1. Use jira_get_ticket to read the full ticket details including description, steps to reproduce, and expected behaviour.

2. Using Chrome browser, log into the QA environment as the appropriate user type (admin/merchant/customer) based on the ticket context. Use credentials from CLAUDE.md.

3. Follow the exact reproducible steps from the ticket. Do not skip any steps.

4. Verify the fix is working end to end.

5. Check surrounding functionality for regression — anything adjacent to what was fixed.

6. Take a screenshot of the final state (passing or failing).

7. Use jira_add_comment to add a comment to the ticket with this format:
   ---
   RETEST RESULT: [PASS / FAIL]
   
   Steps followed:
   [list the steps you performed]
   
   What was verified:
   [describe what you confirmed is working or broken]
   
   Regression check: [Pass / Issues found — describe any]
   
   Tested by: [your name from CLAUDE.md]
   Environment: QA
   Date: [today's date]
   ---

8. If the ticket FAILS retest:
   - Use jira_update_status to move it back to "In Progress"
   - Tag the assigned developer in the comment

9. If the ticket PASSES retest:
   - Use jira_update_status to move it to "Done" or "Closed" as appropriate

Process ALL tickets in the list before summarising. At the end, give a summary table:
| Ticket | Summary | Result |
|--------|---------|--------|
