# Quality Sync MCP

> **Setup & Usage Guide** — [Org] Quality Engineering · Version 1.0

---

## What Is Quality Sync MCP

Quality Sync MCP is a local MCP (Model Context Protocol) server that connects Claude Code directly to your Jira, QMetry, and Confluence workspace. Instead of pasting long prompts or switching between tools, you type short slash commands in your terminal and Claude handles everything — reading tickets, running tests, creating TCs, updating statuses, and writing Confluence pages.

It runs entirely on your local machine. No cloud hosting, no shared server, no external dependencies beyond your own Atlassian credentials.

| Instead of... | You type... |
| --- | --- |
| Opening Jira, reading a ticket, testing manually, writing a comment | `/retest ORG-108` |
| Pasting 30 TC keys into a prompt to create a test cycle | `/test-cycle create cycle Bookings Module regression` |
| Manually creating a Confluence report after each sprint | `/confluence test report Merchant Platform Sprint 12` |
| Switching to Jira to check what's in the current sprint | `/board show sprint` |
| Writing and formatting a bug ticket from scratch | `/raise-bug login fails on mobile HIGH` |
| Exploring an app and writing TCs one by one | `/generate-tcs Bookings` |

---

## Prerequisites

Every team member needs these before starting setup.

| Requirement | How to get it |
| --- | --- |
| Node.js v18+ | <https://nodejs.org> — download the LTS version |
| Git | <https://git-scm.com/downloads> |
| Google Chrome | Latest stable version |
| Claude Pro plan | <https://claude.ai/upgrade> — $20/month minimum |
| Claude Code CLI | `npm install -g @anthropic-ai/claude-code` |
| Jira API token | <https://id.atlassian.com/manage-profile/security/api-tokens> |
| QMetry API key | In Jira: **QMetry menu → Configuration → API Keys** |

> **NOTE:** The Jira API token and the QMetry API key are two different things. You need both. Get them before starting Step 1.

---

## Step 1 — Clone the Repository

Every team member clones the same repo. Your personal credentials are added locally and never pushed to Git.

```powershell
# Create your workspace folder
mkdir D:\quality-sync-mcp
cd D:\quality-sync-mcp

# Clone the repo
git clone https://github.com/malitthh/quality-sync-mcp.git .

# Fix PowerShell execution policy (one-time, your user only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Type Y and press Enter when prompted
```

---

## Step 2 — Build the MCP Server

The MCP server is the TypeScript code that bridges Claude Code to Jira, QMetry, and Confluence. Build it once after cloning, and again whenever the repo gets updated.

```powershell
cd D:\qa-automation\mcp-server
npm install
npm run build

# Verify the build succeeded
ls dist
# You should see: index.js and a tools/ folder containing
# jira.js, qmetry.js, confluence.js
```

> **TIP:** If `npm install` fails with a "scripts disabled" error, run the execution policy fix from Step 1 first.

---

## Step 3 — Build the QMetry Bridge Server

This is a second MCP server specifically for QMetry test case management. It runs alongside the main server.

```powershell
cd D:\quality-sync-mcp
git clone https://github.com/albertor03/jira-qmetry-mcp.git
cd jira-qmetry-mcp
npm install
npm run build

# Create the config file (replace with your real QMetry API key)
'{"baseUrl":"https://org.atlassian.net","apiKey":"YOUR_QMETRY_KEY"}' | Out-File -FilePath "dist\config.json" -Encoding ascii -NoNewline

# Verify it looks clean
cat dist\config.json
```

---

## Step 4 — Configure `.claude.json`

This file tells Claude Code where your MCP servers are and what credentials to use. It lives in your Windows user profile and is personal to you — never share it.

```powershell
notepad C:\Users\YourWindowsUsername\.claude.json
```

Find the line that says `"mcpServers": {}` and replace it with the block below. Use your actual values.

```json
"mcpServers": {
  "autara-qa": {
    "command": "node",
    "args": ["D:/Learning/Source/Repos/quality-sync-mcp/mcp-server/dist/index.js"],
    "env": {
      "JIRA_BASE_URL": "https://org.atlassian.net",
      "JIRA_EMAIL": "your-work-email@org.com",
      "JIRA_API_TOKEN": "YOUR_JIRA_API_TOKEN",
      "QMETRY_BASE_URL": "https://org.atlassian.net",
      "QMETRY_API_KEY": "YOUR_QMETRY_API_KEY"
    }
  }
},
```

> **WARNING:** Use double backslashes (`\\`) in file paths inside JSON. Single backslashes cause a silent failure. The `mcpServers` block must be at the **top level** of the file — not nested inside a `projects` section.

After saving, validate the file is still valid JSON:

```powershell
Get-Content C:\Users\YourWindowsUsername\.claude.json | python -c "import sys,json; json.load(sys.stdin); print('JSON is valid')"
```

---

## Step 5 — Create Your `CLAUDE.md`

`CLAUDE.md` is your personal context file. Claude Code reads it automatically at the start of every session — your app URLs, test credentials, project details, and naming conventions all live here. It is gitignored and stays on your machine only.

```powershell
# Open the template
notepad D:\quality-sync-mcp\CLAUDE.md

# If it does not exist yet, run /init inside Claude Code first,
# then add the QA context section shown below.
```

Add this section to the bottom of your `CLAUDE.md`, replacing all bracketed values:

```markdown
## My Details
Name: [Your Full Name]
Role: SDET
Jira email: [your-work-email@org.com]

## QA Environment
Admin Platform QA URL: https://[qa-url].org.com
Merchant Platform QA URL: https://[qa-url].org.com

## Test Accounts
Admin:
  email: [admin-test@org.com]
  password: [password]
Merchant:
  email: [merchant-test@org.com]
  password: [password]
Customer:
  email: [customer-test@org.com]
  password: [password]

## QMetry
Project key: ORG
Confluence space key: ORG
Folder structure:
  - Admin Platform/Authentication & Login
  - Admin Platform/Dashboard Module
  - Admin Platform/Merchants Module
  - Admin Platform/Bookings Module
  - Admin Platform/Calendar Module
  - Admin Platform/Reviews Module
  - Merchants Platform/[modules]

## TC Naming Convention
Pattern: Verify that the [Module] [action] [condition]
Example: Verify that the Bookings module filter returns
         correct results when status is set to Pending

## Bug Severity Guide
Critical: App crash, data loss, payment failure, security issue
High:     Core feature broken, wrong data shown to user
Medium:   Feature partially working, workaround exists
Low:      UI inconsistency, minor label or spacing issue

## Business Context
Platform:    ORG - Description
User Types:  Description
Payments:    Description
Mobile:      Description
Backend:     Description
```

---

## Step 6 — Enable Chrome Integration

Chrome integration lets Claude Code browse your live QA platform to observe real flows and generate accurate test cases. Without it, Claude can only work from what you describe in prompts.

```powershell
# Start Claude Code from your project folder
cd D:\quality-sync-mcp
claude
```

Inside Claude Code, run:

```
/chrome
```

Then:

1. Select **Install Chrome extension** — opens the Chrome Web Store.
2. Add the extension to Chrome.
3. Click the Claude icon in your Chrome toolbar and sign in.
4. Back in the `/chrome` menu, set **Enabled by default** to **Yes**.
5. Select **Reconnect extension**.

Verify the output shows:

```
Status:             Enabled
Extension:          Connected
Enabled by default: Yes
```

---

## Step 7 — Verify Everything Is Connected

```powershell
cd D:\quality-sync-mcp
claude
```

Inside Claude Code:

```
# Check MCP servers
/mcp
# Expected: org-qa     connected
#           qmetry     connected

# Check Chrome
/chrome
# Expected: Status: Enabled | Extension: Connected
```

Then test that `CLAUDE.md` is being read — ask Claude: *"What is our QMetry project key?"* It should answer **ORG** without you typing it.

---

## Daily Usage — All Commands

Always start Claude Code from your project folder. The slash commands only work when launched from this location.

```powershell
cd D:\quality-sync-mcp
claude
```

### Retesting Tickets

Reads the ticket, tests the fix in Chrome, posts a structured comment (PASS/FAIL, steps followed, regression check, your name, date), and updates the ticket status. Failed tickets are moved back to **In Progress** automatically.

```
# Retest a single ticket
/retest ORG-108

# Retest multiple tickets in one run
/retest ORG-108,ORG-109,ORG-110
```

### Generating Test Cases

Generate TCs directly into QMetry — either by exploring the live app or from a ticket's acceptance criteria.

```
# Generate TCs by exploring the live app (no AC needed)
/generate-tcs Bookings
/generate-tcs Authentication & Login
/generate-tcs Merchants Platform

# Generate TCs from a Jira ticket's acceptance criteria
/generate-tcs ORG-115

# Both — read the ticket AND explore the live app
/generate-tcs ORG-115 Bookings
```

### Test Cycles

```
# Create a cycle — auto-fetches all TCs from the module folder
/test-cycle create cycle Bookings Module regression
/test-cycle create cycle Authentication & Login smoke
/test-cycle create cycle Merchants Platform E2E

# Create a cycle with specific TCs only
/test-cycle create cycle Bookings smoke ORG-TC-84,ORG-TC-85,ORG-TC-86

# Create a test plan
/test-cycle create plan Admin Platform Sprint 12

# Get execution results for a cycle
/test-cycle results ORG-TR-1
/test-cycle report ORG-TR-1
```

### Jira Board Management

```
# View current sprint
/board show sprint

# Filter by status
/board show in progress
/board show bugs
/board show critical bugs

# Filter by person
/board show Person's tickets

# Update ticket status
/board move ORG-108 to done
/board move ORG-108,AUT-109 to in progress

# Search by module or label
/board show bookings tickets
```

### Raising Bugs

```
# Quick bug log
/raise-bug booking confirmation email not sent HIGH

# With module context
/raise-bug Bookings: filter not working after pagination MEDIUM

# Claude will ask for more details if needed
/raise-bug login fails on mobile
```

### Confluence Pages

Claude automatically routes each page to the correct section based on what you ask for and follows your existing page naming patterns.

```
# Test summary report — goes to Test Summary Reports
/confluence test report Merchant Platform Merchant Onboarding

# Release notes — goes to Release Management
/confluence release notes v2.4

# Onboarding guide — goes to Cross-Team Knowledge Sharing
/confluence onboarding guide

# Update an existing page
/confluence update Sprint 11 Test Summary with Sprint 12 results
```

---

## Confluence Space Structure

Claude knows your exact Confluence structure and routes pages automatically:

| Section | What goes here |
| --- | --- |
| Test Summary Reports | Sprint reports, functional & usability summaries, module test reports |
| Test Design, Implementation & Quality Practices | TC guidelines, shift-left docs, quality standards |
| Test & Release Strategy | Overall test strategy, release approach docs |
| Test Coverage by Platforms | Coverage matrices, platform-specific coverage docs |
| Cross-Team Knowledge Sharing | Onboarding guides, team tools, permissions docs |
| Release Management | Release notes, deployment checklists, go/no-go sign-off |
| User Centric Competitive Analysis | Competitor app research, UX findings, feature comparisons |

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm install` — scripts disabled | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `mcpServers` not showing in `/mcp` | Block must be at the **top level** of `.claude.json` — not inside a `projects` section |
| `autara-qa: failed` in `/mcp` | Check double backslashes in the path. Run the JSON validation command. |
| `qmetry: failed` in `/mcp` | Verify `config.json` exists in `jira-qmetry-mcp/dist/` with no BOM |
| `Unknown command: /project:retest` | You must launch `claude` from the `D:\quality-sync-mcp` folder |
| Chrome extension: not connected | Click the Claude icon in the Chrome toolbar and sign in with your account |
| TCs generated from guesses | Chrome not active — restart with `claude --chrome` |
| `CLAUDE.md` changes not picked up | Exit and restart Claude Code from the project folder |
| Auth conflict warning on startup | Run `claude /logout`, then `claude /login` |

---

## Security Rules

Follow these rules to protect team credentials and account access.

- Never share your `.claude.json` file — it contains your Jira API token.
- Never share or commit your `CLAUDE.md` — it contains app passwords.
- Never paste API tokens or passwords into any chat interface.
- Never commit credentials to Git — `CLAUDE.md` and `config.json` are gitignored.
- Revoke and regenerate Jira API tokens at <https://id.atlassian.com> if accidentally exposed.
- Always deny Claude Code requests to access Windows system folders (`System32`, etc.).
- Always launch Claude Code from `D:\quality-sync-mcp` — never from the `C:\` root.

---

## After Pulling Repo Updates

When the repo gets updated with new tools or command improvements, run this to rebuild:

```powershell
cd D:\quality-sync-mcp
git pull
cd mcp-server
npm install
npm run build

# Restart Claude Code
cd D:\quality-sync-mcp
claude
```

> **TIP:** You never need to update your `CLAUDE.md` or `.claude.json` when the repo updates — those are personal files that stay on your machine.

---

<sub>[ORG] Quality Engineering · Compiled for internal reference · Setup Guide v1.0</sub>