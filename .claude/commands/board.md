Manage or query the Autara Jira board. $ARGUMENTS

Parse the argument to understand what the user wants. Examples:

"show sprint" → use jira_query_board with JQL: project = AUT AND sprint in openSprints() ORDER BY status ASC

"show in progress" → JQL: project = AUT AND status = "In Progress" ORDER BY assignee ASC

"show bugs" → JQL: project = AUT AND issuetype = Bug AND status != Done ORDER BY priority DESC

"show critical bugs" → JQL: project = AUT AND issuetype = Bug AND priority = Highest AND status != Done

"show [name]'s tickets" → JQL: project = AUT AND assignee = "[name]" AND status != Done

"show bookings tickets" → JQL: project = AUT AND labels = bookings AND status != Done

"move AUT-108 to done" → use jira_update_status for ticket AUT-108 with transition "Done"

"move AUT-108,AUT-109 to in progress" → use jira_update_status for each ticket

"assign AUT-108 to [name]" → use jira_assign_ticket

"show completed last sprint" → JQL: project = AUT AND sprint in closedSprints() AND status = Done ORDER BY updated DESC

Format the results as a clean table:
| Key | Summary | Status | Assignee | Priority |
|-----|---------|--------|----------|----------|

If the argument is ambiguous, make a reasonable interpretation and execute it.
