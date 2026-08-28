# Deploying Northstar Operations Agent on Railway

**Purpose:** This runbook deploys Northstar outside the current managed workspace, using a Railway application service and a separate Railway MySQL database. It is written for a first external deployment and intentionally keeps the current shared Atlas test database out of the production path.

> **Do not deploy the current branch as a real firm service yet.** The code currently uses managed OAuth, model, and object-storage services that are only available in its original environment. Railway can build and run the Node/React service now, but a secure production deployment also requires the external authentication, model-provider, and object-storage adapters identified in this runbook. Do not work around these requirements by disabling authentication or using the Atlas OAuth credentials.

## 1. What you are creating

Create one Railway project named **Northstar Operations Agent** with two private services: an application service deployed from the existing public GitHub repository and a MySQL database service. Do **not** add public database networking. Railway documents GitHub-based Express deployment and private MySQL service variables in its deployment and MySQL guides.[1] [2]

| Component | Name to use | Purpose | Public? |
|---|---|---|---|
| Railway project | `northstar-operations-agent` | Groups the production service, MySQL, variables, logs, and environments. | No |
| Application service | `northstar-web` | Builds the Node/React service from GitHub. | Yes, after a domain is generated |
| MySQL service | `MySQL` | Dedicated persistent database for Northstar only. | **No** |
| GitHub source | `yashrastogi069-dev/northstar-operations-agent` | Public-safe application code and migrations. | Already public |
| Authentication provider | Auth0 Regular Web Application, or firm-approved equivalent | Replaces the current managed OAuth identity. | N/A |
| Model provider | OpenAI-compatible provider selected by the firm | Replaces the current managed model proxy. | N/A |
| Object storage | AWS S3 or Cloudflare R2 bucket selected by the firm | Replaces the current managed document-storage proxy. | Private |

## 2. Create the Railway project and web service

1. Open [Railway New Project](https://railway.com/new) and sign in with the GitHub account that owns or can access the Northstar repository.
2. Select **GitHub Repository**, search for **`yashrastogi069-dev/northstar-operations-agent`**, and select it.
3. When Railway asks whether to deploy immediately, choose **Add Variables** or allow the first build to run only as a build check. Do not treat the first deployment as production-ready while the external adapters are pending.
4. Rename the resulting service to **`northstar-web`**.
5. In the service’s **Settings**, set the build command to `pnpm install --frozen-lockfile && pnpm build` and the start command to `pnpm start` if Railway does not automatically detect them from `package.json`.
6. Do **not** set `PORT`; Railway supplies it to the application. Northstar already reads `process.env.PORT`.
7. After deployment succeeds, open **Settings → Networking → Generate Domain**. Copy the HTTPS domain; it will be needed when configuring the authentication provider.

Railway’s Node/Express guide describes GitHub deployment, build logs, and domain creation under service networking.[1] Its quick-start also notes that Node applications are automatically detected by its build system.[3]

## 3. Add the dedicated MySQL database

1. In the same Railway project canvas, click **New** (or use the command palette) and choose **Database → MySQL**.
2. Keep the database service name as **`MySQL`**. Wait until its deployment status is healthy.
3. Keep MySQL private. Do **not** enable **Public Access** or copy a public connection string unless there is a specific, separately approved maintenance need.
4. Open the **`northstar-web`** service’s **Variables** tab and add the following variable reference:

| Variable in `northstar-web` | Railway value | Why it is needed |
|---|---|---|
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` | Gives Drizzle and the server an internal MySQL connection string without exposing the database publicly. |

Railway makes `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, and `MYSQL_URL` available from its MySQL service. Its documentation also states that MySQL is private by default, which is the correct setting for this app database.[2]

## 4. Do this **before** production deployment: replace managed-only integrations

The current source has three managed-only dependencies that must be replaced or made provider-selectable before the external app can be declared functional. This is required engineering work, not a Railway setting.

| Current managed dependency | Why it cannot be used externally | Safe external replacement |
|---|---|---|
| Manus OAuth (`VITE_APP_ID`, `OAUTH_SERVER_URL`, managed session SDK) | The OAuth application belongs to the managed workspace and identifies the older Atlas application. | **Auth0 Regular Web Application**, Microsoft Entra ID, Okta, or the firm’s existing OIDC provider. |
| Manus model proxy (`BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`) | The server-side proxy credential is injected only by the managed environment. | An approved OpenAI-compatible API endpoint and server-side API key. |
| Manus storage proxy (`BUILT_IN_FORGE_API_*`, `/manus-storage/*`) | Uploads and presigned download redirects depend on the managed object-storage service. | A private AWS S3 or Cloudflare R2 bucket using scoped server credentials and short-lived download URLs. |

### Authentication: create the provider application

Auth0 is a practical first choice for an external pilot because it has a standard Express OIDC integration. The current Auth0 Express documentation directs you to create a **Regular Web Application**, configure exact callback/logout URLs, and use a server-side session secret.[4]

1. Create an Auth0 tenant if you do not already have an approved identity provider.
2. Create an application named **Northstar Operations Agent** and select **Regular Web Application**.
3. After Railway generates the public domain, set these Auth0 settings using that exact domain:

| Auth0 application setting | Value |
|---|---|
| Allowed Callback URLs | `https://YOUR-RAILWAY-DOMAIN/api/auth/callback` |
| Allowed Logout URLs | `https://YOUR-RAILWAY-DOMAIN/` |
| Allowed Web Origins | `https://YOUR-RAILWAY-DOMAIN` |

4. Do not copy its client secret into GitHub, source files, or chat. Add it only to Railway Variables after the external auth adapter is committed.
5. If the firm uses Microsoft Entra ID, Okta, or Google Workspace identity instead, use the same design: a server-side OIDC code flow, exact HTTPS redirect URI, signed HTTP-only session cookie, and mapped users/roles. Do not bypass authentication for an “internal-only” first deployment.

### Model provider

Choose a provider approved for the firm’s data classification. For an OpenAI-compatible integration, Northstar’s portability layer will use a server-only key and allow the endpoint/model to be configured by environment variables. The following variable names should be used after that adapter is committed:

| Railway variable | Example format only — do not paste a value into GitHub |
|---|---|
| `LLM_PROVIDER` | `openai-compatible` |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` or an approved compatible endpoint |
| `OPENAI_API_KEY` | Provider-issued secret |
| `OPENAI_MODEL` | Firm-approved model identifier |

For initial deployment, do not configure a provider that prohibits your intended document/data handling. Maintain the agent’s existing rule that public and private data are separated, and keep firm knowledge out of the model prompt unless it comes from an approved source and its classification allows the selected provider.

### Object storage

Create one private bucket, for example `northstar-firm-documents-prod`. Use a service credential restricted to that bucket and the minimum object operations required for server-side uploads/downloads. Use the following environment-variable contract after the S3-compatible adapter is committed:

| Railway variable | Meaning |
|---|---|
| `STORAGE_PROVIDER` | `s3` or `r2` |
| `S3_BUCKET` | The private bucket name |
| `S3_REGION` | Bucket region or `auto` for compatible providers where appropriate |
| `S3_ENDPOINT` | Provider endpoint; required for R2-compatible storage |
| `S3_ACCESS_KEY_ID` | Server-only scoped credential |
| `S3_SECRET_ACCESS_KEY` | Server-only scoped credential |
| `S3_PUBLIC_BASE_URL` | Omit unless a deliberate public object policy is approved; Northstar should use signed URLs instead |

## 5. Add non-secret Railway variables

After the external portability update is committed, set the following in **`northstar-web` → Variables**:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` |
| `APP_BASE_URL` | Your generated `https://…railway.app` domain |
| `AUTH_PROVIDER` | `auth0` (or the firm-approved OIDC provider) |
| `AUTH0_ISSUER_BASE_URL` | Your Auth0 domain, e.g. `https://tenant.region.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application secret — keep this secret |
| `AUTH0_SESSION_SECRET` | Long random server secret — keep this secret |
| `LLM_PROVIDER` | `openai-compatible` |
| `OPENAI_BASE_URL` | Approved model API base URL |
| `OPENAI_API_KEY` | Model-provider secret |
| `OPENAI_MODEL` | Firm-approved model identifier |
| `STORAGE_PROVIDER` | `s3` or `r2` |
| S3 variables above | Private object-storage configuration |

Optional values must remain disabled until separately approved: `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`, plus any connector credential. Never set `BUILT_IN_FORGE_API_KEY`, `BUILT_IN_FORGE_API_URL`, `VITE_APP_ID`, or `OAUTH_SERVER_URL` in Railway for production; those belong to the original managed environment.

## 6. Apply schema migrations exactly once

After `DATABASE_URL` is configured and before first real users or documents, apply the **committed** migrations to the new Railway MySQL database.

1. Install the Railway CLI locally from Railway’s current CLI instructions, then run `railway login` and authenticate.
2. Clone the repository or use your existing clone, then run `railway link` and select the **Northstar** Railway project and production environment.
3. Run:

```bash
railway run pnpm drizzle-kit migrate
```

4. Confirm that the command succeeds and that the Drizzle migrations table records the migration history. Do not run `pnpm drizzle-kit generate` in production and do not use `db:push` as a substitute for the reviewed migration files.
5. In Railway’s MySQL query console or another private connection, confirm the expected tables exist, including `users`, `knowledgeSources`, `knowledgeDocuments`, `knowledgeChunks`, `agentRuns`, `agentStateSnapshots`, `agentToolCalls`, `agentApprovals`, `agentArtifacts`, `agentMemories`, `agentIntegrations`, `agentEvaluationResults`, and `agentRunFeedback`.

## 7. Deploy and verify

After the portability adapter work, required variables, and migrations are complete:

1. Trigger a Railway deployment of `northstar-web` from the `main` branch.
2. Open **Deployments → View Logs**. The success condition is a healthy Node process bound to Railway’s supplied `PORT`; there must be no missing OAuth, model, storage, or database environment-variable error.
3. Open the generated HTTPS domain. You should see the Northstar sign-in boundary, not the legacy Firm Knowledge Agent identity.
4. Sign in through the external identity provider. Confirm that the owner is provisioned as an administrator and an ordinary test user receives only user-level access.
5. As the ordinary test user, run a harmless public-research workflow. Verify one `agentRuns` record, ordered state snapshots, bounded `agentToolCalls`, and a final result.
6. Submit a request that asks Northstar to send, publish, or update a record. Verify that it creates an **internal draft and approval record only**, with no connected system changed.
7. Submit an instruction-override or secret-extraction attempt. Verify that the policy blocks it before tools run.
8. Upload only a non-sensitive pilot document into a new **draft** knowledge source, approve it as an administrator, then verify role-aware retrieval. Do not upload firm records until the external storage, model, retention, and access-control review is complete.

## 8. Production safety checklist

| Check | Required state before real firm use |
|---|---|
| Database | Separate private Railway MySQL service; no Atlas data or production database reuse. |
| Authentication | External OIDC application configured with exact HTTPS callback/logout URLs; no anonymous bypass. |
| Secrets | Railway Variables only; no secret in GitHub, logs, browser code, or client-side environment variables. |
| Storage | Private bucket; scoped credentials; signed download URLs; retention policy confirmed. |
| Model provider | Firm-approved provider, region, retention, and data-handling terms. |
| Agent tools | Only existing read-only/draft-only tools enabled. No email, CRM, payment, shell, browser-control, or external-write tool. |
| Approval | Review records remain non-executing until a durable checkpointer/native resume design and a per-tool external-action design are implemented. |
| Monitoring | Railway logs plus Northstar run traces and audits reviewed; alerts configured before broad use. |
| Backups | Railway MySQL backup/recovery plan verified before storing any firm evidence. |

## 9. What to send me after you complete the account setup

Send only the **non-secret** items: the Railway project name, generated application domain, MySQL service name, chosen authentication provider, chosen model provider, and chosen private object-storage provider. Do not paste passwords, API keys, database URLs, OAuth client secrets, or storage keys into chat. I will then make and test the required external portability adapter in the GitHub repository and give you the exact Railway variable names to fill through the Railway dashboard.

## References

[1]: https://docs.railway.com/guides/express "Railway: Deploy an Express App"
[2]: https://docs.railway.com/databases/mysql "Railway: MySQL"
[3]: https://docs.railway.com/quick-start "Railway Quick Start"
[4]: https://auth0.com/docs/quickstart/webapp/express "Auth0: Add Login to Your Express Application"
