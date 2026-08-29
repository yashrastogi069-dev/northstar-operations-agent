# Run Northstar locally on Windows

Northstar is a TypeScript React/Express application. The supported local path is Windows 10 or 11 with Node.js LTS, pnpm, Git, and a MySQL-compatible database. This guide is for **Northstar only**; Atlas remains a separate application and is not changed by these launcher files.

## 1. Install prerequisites

Install the current Node.js LTS release from [nodejs.org](https://nodejs.org/), Git from [git-scm.com](https://git-scm.com/download/win), and a local or hosted MySQL-compatible database. Open **Command Prompt** and install pnpm once:

```cmd
npm install --global pnpm
```

Verify the tools:

```cmd
node --version
pnpm --version
git --version
```

## 2. Get the Northstar source

Clone the public repository into a folder you control:

```cmd
mkdir C:\AI-Projects
cd /d C:\AI-Projects
git clone https://github.com/yashrastogi069-dev/northstar-operations-agent.git
cd /d C:\AI-Projects\northstar-operations-agent
```

The one-click launcher is `START_NORTHSTAR_LOCAL.bat` in the repository root. You can double-click it from File Explorer after the environment is configured.

## 3. Create the local environment file

The first launcher run copies `.env.example` to `.env` and stops so you can edit it. Alternatively, create it directly from Command Prompt:

```cmd
copy .env.example .env
notepad .env
```

Replace all `replace-with-...` values. For a fully external setup with no Manus services, follow `NON_MANUS_SETUP.md`; it explains Auth0/OIDC, OpenAI-compatible inference, S3-compatible storage, optional webhooks, and Railway MySQL. Do not use Atlas production credentials or Atlas production data. Do not commit `.env`; it is ignored by Git.

For a purely local development database, the database URL should point to your local MySQL-compatible server, for example:

```text
DATABASE_URL=mysql://northstar_user:your-password@127.0.0.1:3306/northstar_local
```

Northstar supports the external OIDC, model, S3-compatible storage, and webhook settings documented in `NON_MANUS_SETUP.md`. If those external values are not configured yet, the corresponding feature will fail clearly; do not replace missing credentials with anonymous access. Northstar must remain authenticated and governed.

## 4. Install dependencies and apply the schema

From the Northstar repository root:

```cmd
pnpm install
pnpm check
pnpm drizzle-kit migrate
```

For a brand-new local database, the committed migrations create the application schema. Review migration output before applying it. Never point this command at Atlas’s production database.

If you are using an external Railway database later, use the provider’s private `DATABASE_URL` only through the Railway environment settings and run the migration command from a controlled deployment shell; do not paste that URL into GitHub.

## 5. Start Northstar with one click

Double-click:

```text
START_NORTHSTAR_LOCAL.bat
```

The launcher checks for Node.js, pnpm, the repository root, `.env`, and dependencies. It starts the development server on port `3004` and keeps the Command Prompt window open. Open:

```text
http://localhost:3004
```

You can also start it manually. The `dev` package script now sets `NODE_ENV` through `cross-env`, so this works in Windows CMD, PowerShell, macOS, and Linux:

```cmd
set PORT=3004
pnpm dev
```

You do not need to type `NODE_ENV=development` yourself. The project script sets it correctly for your operating system.

Use `Ctrl+C` in the running Command Prompt window to stop the server.

## 6. Verify the local application

Run the automated checks before using the local UI:

```cmd
pnpm check
pnpm test
pnpm build
```

Then open `http://localhost:3004`, sign in through the authorized OAuth flow, and test both Northstar workspaces:

| Workspace | Safe first test |
|---|---|
| Agent Desk | Ask for a bounded research briefing or a local CSV analysis. Confirm the run trace and tool evidence appear. |
| Evidence Desk | Ask an evidence question in `/evidence`. Confirm the answer is either cited from approved sources or explicitly declines for insufficient evidence. |

Use only synthetic or approved development documents during local testing. Do not upload client records or confidential firm material until storage, retention, access roles, and deployment identity have been separately approved.

## Troubleshooting

If the launcher creates `.env` and exits, edit `.env` and run it again. If you already have a copied Northstar checkout, pull the latest repository change before testing so the cross-platform `cross-env` script fix is present. If `pnpm` is not recognized, reopen Command Prompt after installing pnpm or run `npm install --global pnpm` again. If the database connection fails, verify that MySQL is running, the database exists, the user has the required permissions, and `DATABASE_URL` has no unescaped special characters in its password. If port `3004` is busy, close the existing Northstar window or run manually with another port, for example `set PORT=3005` followed by `pnpm dev`.

If OAuth redirects to a wrong application, the local `.env` is using an incorrect `VITE_APP_ID` or callback configuration. Create or select a Northstar-specific development OAuth application and register the local callback URL required by the authentication provider. Do not disable the authentication boundary to work around this issue.

## Source-control safety

Never commit `.env`, credentials, private keys, firm documents, database exports, or raw sensitive traces. The repository should contain only source, safe examples, migrations, and public documentation. Before pushing changes:

```cmd
git diff --check
git status --short
```
