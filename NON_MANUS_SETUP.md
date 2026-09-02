# Northstar non-Manus setup

This guide configures Northstar with external services instead of Manus-managed authentication, model inference, object storage, and notifications. The documented external stack is Render for the application, TiDB Cloud for the database, Auth0 for standards-based OIDC login, OpenRouter for OpenAI-compatible model and embedding inference, and Cloudflare R2 for private S3-compatible object storage. Northstar combines persisted embedding similarity with a governed keyword fallback.

> Do not put secrets in GitHub, `.env.example`, screenshots, browser messages, or support tickets. Use `.env` locally and Railway’s sealed variables in production.

## 1. Update the source first

From Command Prompt:

```cmd
cd /d "C:\Users\win 10\Desktop\northstar-operations-agent"
git pull origin main
pnpm install
```

The latest source includes an external OIDC callback, an OpenAI-compatible model and embedding endpoint, an S3-compatible storage adapter, cross-platform Windows scripts, explicit public-research consent, and an optional HTTPS notification webhook. The old managed variables remain only as a compatibility fallback; they are not needed in external mode.

## 2. Create the local environment file

Copy the safe template once:

```cmd
copy .env.example .env
notepad .env
```

Use `.env.example` only as a template. Replace every `CHANGE_ME` value in `.env`. Keep the file in the Northstar root directory, beside `package.json`. Do not rename it to `.env.txt`; Windows Notepad may add that extension unless “All Files” is selected.

## 3. Create a dedicated database

For local-only testing, install MySQL 8 or use Docker Desktop, create a database named `northstar_local`, and create a database user that has access only to that database. Use a connection string with URL-encoded special characters in the password:

```env
DATABASE_URL=mysql://northstar_user:URL_ENCODED_PASSWORD@127.0.0.1:3306/northstar_local
```

For production on Render, configure the TiDB Cloud connection string as a sealed environment variable. Do not use the local database or Atlas data in production. The application only needs one database URL; no generated database user ID is required for upload access.

```env
DATABASE_URL=mysql://USER:PASSWORD@GATEWAY_HOST:4000/northstar_production?sslaccept=strict
```

Keep TiDB Cloud network access restricted to the Render service where possible, require TLS, and never commit the connection string. If a database connection fails, Northstar logs a redacted host/port/database target and a concrete diagnostic without printing credentials.

Apply the committed schema only after checking that `DATABASE_URL` points to Northstar’s database:

```cmd
pnpm drizzle-kit migrate
```

Never run this command against Atlas production data.

## 4. Create the external login application

Northstar uses standard OIDC authorization-code login when `AUTH_PROVIDER=oidc`. Auth0 is the documented example, but another OIDC provider can be used if it supports authorization code flow, a token endpoint, and a user-info endpoint.

In Auth0:

1. Open the [Auth0 Dashboard](https://manage.auth0.com/dashboard/).
2. Go to **Applications → Create Application**.
3. Name it `Northstar Local`.
4. Choose **Regular Web Applications**.
5. In **Allowed Callback URLs**, add `http://localhost:3004/api/oauth/callback`.
6. In **Allowed Logout URLs**, add `http://localhost:3004`.
7. In **Allowed Web Origins**, add `http://localhost:3004` if the provider requests it.
8. Save the application.
9. Copy the application’s **Domain** and **Client ID**. Generate or copy the **Client Secret** from the application settings.

Auth0 requires callback URLs to be explicitly allow-listed. Do not use a wildcard callback URL. [2]

For local `.env`, enter:

```env
AUTH_PROVIDER=oidc
OIDC_ISSUER_URL=https://YOUR_TENANT.us.auth0.com
OIDC_CLIENT_ID=YOUR_AUTH0_CLIENT_ID
OIDC_CLIENT_SECRET=YOUR_AUTH0_CLIENT_SECRET
OIDC_SCOPE=openid profile email
VITE_AUTH_PROVIDER=oidc
VITE_OIDC_ISSUER_URL=https://YOUR_TENANT.us.auth0.com
VITE_OIDC_CLIENT_ID=YOUR_AUTH0_CLIENT_ID
VITE_OIDC_SCOPE=openid profile email
VITE_OIDC_AUDIENCE=
```

The server-side client secret must not use a `VITE_` prefix. Variables beginning with `VITE_` are bundled into browser code and must never contain private secrets. The duplicate public OIDC issuer/client ID values are intentional; the browser needs the authorization endpoint, while the server needs the client secret for the token exchange.

For production, add the exact production callback URL as another Auth0 allow-listed URL, for example `https://northstar.example.com/api/oauth/callback`, and the exact root URL to Allowed Logout URLs. Set `ADMIN_EMAILS` to the administrator’s Auth0 email address. When that address logs in, Northstar updates the existing database user to `admin`; no generated database ID needs to be copied into Render. Keep local and production OAuth applications separate where possible.

## 5. Create model access

Create an API key in the [OpenRouter Keys page](https://openrouter.ai/keys). Store it in a password manager and add it only to `.env` locally or to a sealed Render environment variable.

```env
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=YOUR_OPENROUTER_API_KEY
LLM_MODEL=openai/gpt-4o-mini
EMBEDDING_MODEL=openai/text-embedding-3-small
```

The server sends chat requests to `/v1/chat/completions` and embedding requests to `/v1/embeddings`. `LLM_MODEL` and `EMBEDDING_MODEL` must be model identifiers available through the selected provider. Do not expose `OPENAI_API_KEY` to the browser and do not use it in a variable with a `VITE_` prefix.

The model service is metered separately from hosting. Set an account budget and monitor usage before inviting other users.

## 6. Create private object storage

For document uploads and generated artifacts, create a Cloudflare R2 bucket named `northstar-local` or `northstar-production`. In Cloudflare:

1. Open **R2 Object Storage**.
2. Create the bucket.
3. Open **Manage R2 API Tokens**.
4. Create a token with **Object Read & Write** permission scoped to the Northstar bucket only.
5. Copy the Access Key ID and Secret Access Key immediately; the secret is not shown again.
6. Find the Cloudflare account ID.
7. Use the endpoint `https://ACCOUNT_ID.r2.cloudflarestorage.com`.

Configure:

```env
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=northstar-local
S3_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY=YOUR_R2_SECRET_ACCESS_KEY
```

Cloudflare documents that R2 uses the S3 API and that object permissions can be scoped to selected buckets. [4]

The Northstar server uploads through the S3 SDK and returns a short-lived signed download URL. Do not make the bucket public. Use a separate bucket or prefix for production, and do not upload real firm documents during initial local testing.

## 7. Semantic retrieval

Configure the embedding model next to the OpenRouter chat model:

```env
EMBEDDING_MODEL=openai/text-embedding-3-small
```

On upload, Northstar extracts the document, chunks it, requests embeddings in bounded batches, and stores the vectors with the chunk metadata in TiDB. Retrieval compares the question vector with authorized chunk vectors and combines that score with keyword overlap. If the provider is unavailable, ingestion remains usable with a clearly labeled keyword fallback; malformed or legacy vectors never crash retrieval. A separate Qdrant service is not required by this path.

## 8. Owner identity and session secret

Generate the session signing secret locally:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set:

```env
JWT_SECRET=PASTE_THE_GENERATED_RANDOM_VALUE
ADMIN_EMAILS=admin@example.com
OWNER_OPEN_ID=
OWNER_NAME=Northstar Admin
```

`ADMIN_EMAILS` is the stable administrator bootstrap. Use the exact email returned by Auth0; multiple addresses may be comma-separated. On successful OIDC login, Northstar promotes that identity to `admin` in the existing `users` record. `OWNER_OPEN_ID` remains optional for legacy owner-specific behavior and is not needed just to enable uploads.

## 9. Optional notifications

Northstar can send bounded owner notifications to an administrator-approved HTTPS webhook. Leave these blank until you have a trusted destination:

```env
NOTIFICATION_WEBHOOK_URL=https://your-approved-webhook.example/endpoint
NOTIFICATION_WEBHOOK_TOKEN=YOUR_PRIVATE_WEBHOOK_BEARER_TOKEN
```

The server rejects non-HTTPS webhook URLs, sends only title/content/text fields, applies a 7.5-second timeout, and returns failure without blocking the core run. Use a dedicated webhook or private automation endpoint rather than a personal URL. Do not use an arbitrary URL supplied by an agent request.

## 10. Values that must not be used in non-Manus mode

Remove these from `.env` or leave them absent:

```env
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
VITE_APP_ID=
```

The external path uses `AUTH_PROVIDER=oidc`, the `OIDC_*` values, `OPENAI_*` values, and `S3_*` values instead. Keeping a `VITE_APP_ID` placeholder can make it look as if the old managed application identity is still required.

## 11. Start and verify locally on Windows

After saving `.env`:

```cmd
cd /d "C:\Users\win 10\Desktop\northstar-operations-agent"
pnpm install
pnpm check
pnpm test
pnpm dev
```

The development server should start on port `3004` unless that port is already busy. Open `http://localhost:3004`. Select sign in, complete Auth0 login, and confirm that the browser returns to `/` rather than showing an OAuth callback error. When testing logout, Northstar clears its own cookie and then redirects through Auth0’s `/v2/logout` endpoint so the Auth0 SSO session is ended too. The legacy Manus path does not use this redirect.

Then verify both workspaces with synthetic data:

1. Open **Agent Desk** and run a harmless research request.
2. Open **Evidence Desk** and search only an approved test source.
3. Confirm citations are visible and no unapproved source appears.
4. Submit a review-tier request and confirm that it creates an approval record but does not perform an external write.
5. Open **Run Traces** and confirm that the run status and tool ledger are recorded.
6. Confirm the local database contains no Atlas records and that `.env` is not tracked by Git.

## 12. Railway production sequence

Create a Railway project from the Northstar GitHub repository, add a private MySQL service, configure all environment values in the Northstar service’s Variables tab, and deploy the service. Railway variables are staged and must be deployed before they affect the running service. [1]

Set the service start command to the committed production command, register the production callback URL in the OIDC provider, then run the migration command against the Railway private database using a controlled one-time administrative shell or release step. Do not use a public database URL in the application.

Before inviting users, verify the health boundary, sign-in/logout, one allowed read-only workflow, one review-tier workflow, source-role filtering, failed-run recovery, and audit records. Keep all write-capable integrations disabled until the firm has approved exact scopes and human approval semantics.

## References

[1]: https://docs.railway.com/databases/mysql "Railway MySQL and database variables"
[2]: https://auth0.com/docs/get-started/applications/application-settings "Auth0 application settings and callback URLs"
[3]: https://developers.openai.com/api/docs/quickstart "OpenAI API quickstart and API key setup"
[4]: https://developers.cloudflare.com/r2/api/tokens/ "Cloudflare R2 API tokens and S3-compatible credentials"
