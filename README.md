# Autara QA Automation

Claude Code + custom MCP server for the Autara QA team.

## What this gives you

Type short commands in Claude Code instead of pasting 50-line prompts:

```
/project:retest AUT-108,AUT-109
/project:generate-tcs Bookings
/project:generate-tcs AUT-115
/project:raise-bug login fails on mobile HIGH
/project:board show sprint
/project:board show critical bugs
/project:confluence test report Sprint 12
```

## First-time setup

### 1. Prerequisites
- Node.js v18+
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- Claude Pro plan ($20/month minimum)
- Jira API token (get from https://id.atlassian.com/manage-profile/security/api-tokens)
- QMetry API key (from QMetry > Configuration > API Keys)

### 2. Clone the repo

```powershell
mkdir D:\qa-automation
cd D:\qa-automation
git clone https://github.com/augmarateam/autara-qa-automation.git .
```

### 3. Fix PowerShell execution policy (one-time)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 4. Build the MCP server

```powershell
cd D:\qa-automation\mcp-server
npm install
npm run build
```

### 5. Set up the QMetry MCP server

```powershell
cd D:\qa-automation
git clone https://github.com/albertor03/jira-qmetry-mcp.git
cd jira-qmetry-mcp
npm install
npm run build

# Create config.json (use your actual QMetry API key)
'{"baseUrl":"https://augmarateam.atlassian.net","apiKey":"YOUR_KEY"}' | Out-File -FilePath "dist\config.json" -Encoding ascii -NoNewline
```

### 6. Configure .claude.json

Open `C:\Users\YourWindowsUsername\.claude.json` in Notepad.

Copy the `mcpServers` block from `claude-config-template.json` and paste it into your `.claude.json`, replacing the existing `"mcpServers": {}` line.

Fill in:
- `JIRA_EMAIL` — your work email
- `JIRA_API_TOKEN` — from Atlassian account settings
- `QMETRY_API_KEY` — from QMetry configuration

### 7. Create your CLAUDE.md

```powershell
Copy-Item D:\qa-automation\CLAUDE.md.template D:\qa-automation\CLAUDE.md
notepad D:\qa-automation\CLAUDE.md
```

Fill in all bracketed values with your real credentials and details.

### 8. Enable Chrome integration

```powershell
cd D:\qa-automation
claude
```

Inside Claude Code:
```
/chrome
```
Select "Install Chrome extension" → install from Chrome Web Store → sign in with your Claude account → set "Enabled by default: Yes" → Reconnect extension.

### 9. Verify everything is connected

Inside Claude Code:
```
/mcp
```

You should see both `autara-qa` and `qmetry` showing as connected.

## Daily usage

Always start from the project folder:

```powershell
cd D:\qa-automation
claude
```

### Commands

| Command | What it does |
|---------|-------------|
| `/project:retest AUT-108` | Retest a single ticket |
| `/project:retest AUT-108,AUT-109,AUT-110` | Retest multiple tickets |
| `/project:generate-tcs Bookings` | Generate TCs by exploring the live app |
| `/project:generate-tcs AUT-115` | Generate TCs from ticket AC |
| `/project:raise-bug [description]` | Log a bug in Jira |
| `/project:board show sprint` | See current sprint tickets |
| `/project:board show critical bugs` | Filter by bug severity |
| `/project:board move AUT-108 to done` | Update ticket status |
| `/project:confluence test report Sprint 12` | Create Confluence page |

## Security

- Never commit `CLAUDE.md` — it's gitignored
- Never commit your real `.claude.json`
- Never paste API tokens in chat
- Revoke tokens at https://id.atlassian.com if accidentally exposed
