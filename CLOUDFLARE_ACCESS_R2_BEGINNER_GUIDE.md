# Northstar with Cloudflare Access and Cloudflare R2

This guide protects a deployed Northstar application with Cloudflare Access and stores private uploaded documents in Cloudflare R2. It assumes that Northstar runs on an external host such as Railway and that you own a domain or subdomain in Cloudflare.

> **Important cost truth:** Cloudflare Access has a free plan for small deployments, but the current account dashboard is the source of truth for your seat allowance. Cloudflare R2 is not an unlimited free service. Cloudflare’s current documentation says you must purchase R2 before creating an R2 API token, and storage, operations, and egress can exceed free allowances. OpenAI/model usage, Railway hosting, and a domain can also cost money. This setup can be inexpensive, but “free forever with no limits” cannot be guaranteed. [1] [2]

## What the finished route looks like

```text
Your browser
    |
    | 1. Cloudflare Access email/identity check
    v
https://northstar.your-domain.com
    |
    | 2. Cloudflare proxy forwards only allowed users
    v
Railway Northstar service
    |
    +--> Railway private MySQL database
    +--> Private R2 bucket through the S3 API
    +--> External OIDC/model provider as configured
```

Cloudflare Access protects the application at the edge. Northstar still keeps its own application-level authorization, approval gates, audit records, and role checks. Access is not a replacement for those controls.

## Part 1 — Accounts and prerequisites

Create or use these accounts:

| Item | Required? | Why |
|---|---:|---|
| Cloudflare account | Yes | Access, DNS, and R2. |
| Domain managed by Cloudflare | Yes for a stable custom hostname | Needed for a permanent `northstar.example.com` route. A free `trycloudflare.com` tunnel is not a permanent production address. |
| Railway account | Yes for the external application host | Runs the Node service and can provide MySQL. |
| OpenAI or another model provider | Yes for live model answers | Model calls are normally metered; a provider key is required. |
| Auth0/OIDC | Optional when Access is the only edge login | Northstar’s current app-level OIDC path can remain disabled if Access is the sole controlled gateway, but the application must still receive a trusted local/operator identity or a protected proxy identity. |

Use separate Northstar resources. Do not reuse Atlas’s database, bucket, OAuth application, domain, or secrets.

## Part 2 — Put your domain in Cloudflare

If you already own a domain:

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com/).
2. Select **Add a website**.
3. Enter your domain, such as `example.com`.
4. Choose the Free plan if it meets your needs.
5. Cloudflare will show two nameservers.
6. Sign in to the company where you purchased the domain.
7. Replace the domain’s current nameservers with the two Cloudflare nameservers.
8. Wait for Cloudflare to confirm the nameserver change.

If you do not own a domain, you can use a Railway-provided temporary domain for testing, but a stable custom Cloudflare Access route normally requires a domain you control. Domain registration is usually not free.

## Part 3 — Create the Railway Northstar service

1. Open [Railway](https://railway.com/).
2. Create a new project.
3. Choose **Deploy from GitHub repo**.
4. Select `yashrastogi069-dev/northstar-operations-agent`.
5. Add a MySQL database service in the same project.
6. In the Northstar service’s Variables tab, add the database reference:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

Railway documents the MySQL variables and service references in its MySQL guide. [3]

7. Deploy the service.
8. Open **Settings → Networking** and create a public domain temporarily, for example `northstar-production.up.railway.app`.
9. Test that the service responds before adding Cloudflare Access.

Do not put production secrets in `package.json`, GitHub, or the repository. Use Railway’s Variables tab.

## Part 4 — Create a Cloudflare Access application

1. Open the Cloudflare dashboard.
2. Select your account.
3. Open **Zero Trust**. If Cloudflare asks you to create a team/organization name, choose a unique name and keep it simple, such as `northstar-firm`.
4. Open **Access → Applications**.
5. Select **Add an application**.
6. Select **Self-hosted**.
7. Enter the application name `Northstar Operations Agent`.
8. Enter the hostname you will use, such as `northstar.example.com`.
9. Create an Access policy named `Northstar approved operators`.
10. Set the policy action to **Allow**.
11. For the Include rule, choose **Emails** and add the exact email addresses allowed to use Northstar.
12. Do not add an “Everyone” allow rule.
13. Choose an authentication method. The easiest beginner option is **One-time PIN**. Cloudflare sends a single-use code to an approved email address. [1]
14. Save the application.

With One-time PIN, the user visits the protected hostname, enters an allowed email address, receives a code, and enters the code. The code is single-use and expires after the period described by Cloudflare. A blocked email should not be added to the policy.

Cloudflare’s official OTP instructions are at [One-time PIN login](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/). [1]

## Part 5 — Connect the Cloudflare hostname to Railway

There are two common ways to connect the domain.

### Option A: Cloudflare Tunnel

Use this when you want to keep the Railway service private or do not want to manage a normal DNS origin record.

1. In Cloudflare Zero Trust, open **Networks → Tunnels**.
2. Select **Create a tunnel**.
3. Choose the Cloudflared connector.
4. Name it `northstar-production`.
5. Cloudflare will show an installation command. Run that command on a persistent machine or deployment environment that can reach the Railway service.
6. Add a public hostname such as `northstar.example.com`.
7. Set the service URL to the Railway Northstar URL, for example `https://northstar-production.up.railway.app`.
8. Save the route.
9. Return to **Access → Applications** and confirm the application hostname matches `northstar.example.com`.

A tunnel connector must keep running. If it runs on your personal Windows computer, Northstar stops being reachable when the computer is off. For a permanent route, run the connector on an always-on host or use Railway’s public hostname behind Access.

### Option B: Cloudflare DNS hostname

Use this when Railway supplies a public hostname and supports the DNS target you need.

1. Open **DNS → Records** in Cloudflare.
2. Add the record required by Railway, commonly a CNAME.
3. Point `northstar.example.com` to the Railway-provided hostname.
4. Follow Railway’s TLS/custom-domain instructions.
5. Wait until HTTPS works.
6. Use the exact HTTPS hostname in Cloudflare Access.

Do not use a plain HTTP origin for a real deployment.

## Part 6 — Create the private R2 storage bucket

R2 stores uploaded documents and generated artifacts. The bucket should remain private. Do not enable the public `r2.dev` URL for firm documents. Cloudflare states that buckets are private by default, while public URLs explicitly expose contents to the internet. [2]

1. In Cloudflare, open **R2 Object Storage**.
2. Select **Create bucket**.
3. Name it `northstar-production`.
4. Choose the required jurisdiction carefully; changing data location later may require migration.
5. Keep public access disabled.
6. Open **Manage R2 API Tokens**.
7. Select **Create Account API token** only if you control the account and need a service credential, or use the least-privileged available token type.
8. Choose **Object Read & Write**.
9. Scope the token to only the `northstar-production` bucket.
10. Create the token.
11. Copy the **Access Key ID** and **Secret Access Key** immediately. Cloudflare says the secret may not be shown again. [2]
12. Find your Cloudflare account ID in the dashboard.
13. Use this endpoint:

```text
https://ACCOUNT_ID.r2.cloudflarestorage.com
```

Cloudflare documents the endpoint and bucket-scoped permissions in its R2 authentication guide. [2]

Put these values into Railway Variables or your local `.env`:

```env
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=northstar-production
S3_ACCESS_KEY_ID=the-r2-access-key-id
S3_SECRET_ACCESS_KEY=the-r2-secret-access-key
```

The Northstar server uses these values to upload with the S3 API and issue short-lived signed download URLs. The browser should never receive `S3_SECRET_ACCESS_KEY`.

## Part 7 — Configure Northstar’s app URL and security values

In Railway Variables, set at least:

```env
NODE_ENV=production
PORT=3004
DATABASE_URL=${{MySQL.MYSQL_URL}}
JWT_SECRET=generate-a-long-random-secret
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-private-model-key
LLM_MODEL=gpt-4o-mini
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=northstar-production
S3_ACCESS_KEY_ID=your-r2-access-key
S3_SECRET_ACCESS_KEY=your-r2-secret-key
```

Generate `JWT_SECRET` locally with:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If using Northstar’s external OIDC path as well as Cloudflare Access, configure the exact production callback URL in the OIDC provider:

```text
https://northstar.example.com/api/oauth/callback
```

If Cloudflare Access is the sole login gateway, you must still confirm how Northstar creates its authenticated application user. Access protects the edge, but it does not automatically create Northstar’s internal database user unless the application has a trusted identity bridge. Do not switch off Northstar authorization blindly.

## Part 8 — First safe test

Use synthetic documents and a test database first.

1. Visit `https://northstar.example.com`.
2. Confirm Cloudflare Access appears before Northstar.
3. Enter an approved email and complete the OTP code.
4. Confirm the request reaches Northstar.
5. Open Agent Desk and run a harmless read-only request.
6. Open Evidence Desk and search an approved test source.
7. Upload only a synthetic test document.
8. Confirm the document is stored in the private R2 bucket.
9. Confirm the browser receives a signed URL, not the R2 secret.
10. Try an unapproved email and confirm access is denied.
11. Try a review-tier request and confirm an approval record is created without an external write.
12. Inspect Railway logs for errors without copying sensitive request content into tickets or GitHub.

## Part 9 — What “free and permanent” means here

| Component | Free forever? | Honest limitation |
|---|---:|---|
| Cloudflare Access | Often usable on a free plan for a small number of users | Seat/features/plan limits can change; confirm the current dashboard. |
| Cloudflare DNS/SSL | Free plan available | A domain still generally costs money to register. |
| Cloudflare R2 | Not unlimited free | R2 must be activated/purchased before API tokens; storage and operations have allowances and usage pricing. |
| Railway | May have trial/limited plans | Hosting/database availability and pricing depend on the current Railway plan. |
| OpenAI | No guaranteed unlimited free production use | API calls are metered. |
| Cloudflare Tunnel | Product availability depends on current Cloudflare plan and connector availability | A connector must run continuously somewhere. |

The permanently controlled part is ownership: create the Cloudflare account, domain, bucket, Access policy, Railway project, and secrets under accounts you control. Do not base a firm system on a temporary browser session or a free trial.

## References

[1]: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/ "Cloudflare One-time PIN login"
[2]: https://developers.cloudflare.com/r2/api/tokens/ "Cloudflare R2 authentication and API tokens"
[3]: https://docs.railway.com/databases/mysql "Railway MySQL database guide"
