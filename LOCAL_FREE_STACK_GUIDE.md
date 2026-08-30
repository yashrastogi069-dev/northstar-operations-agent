# Northstar Local-Only Stack: Free Software, Local Database, and Self-Hosted Login

## The short answer

Yes. Northstar can run entirely on your Windows computer with no Manus account, no Railway database, no Cloudflare Access account, and no paid identity-provider quota.

The recommended local stack is:

| Need | Local choice | Cost model |
|---|---|---|
| Database | MySQL Community Server | Free software; uses your disk and memory. |
| Login | Keycloak with OpenID Connect | Free, self-hosted software; you manage users and security. |
| Model | Ollama with a local model | Free software and no API bill; requires enough RAM/CPU/GPU. |
| Object storage | MinIO | Free, self-hosted S3-compatible software; uses your disk. |
| Northstar | Node.js + pnpm | Runs locally at `http://localhost:3004`. |

This is not “unlimited” in the physical sense. Your computer’s disk, memory, backups, and hardware are the limits. There is also no free email delivery unless you configure an SMTP provider. The local version is permanent in the sense that it does not expire because of a hosted free-plan quota, but it only works while your computer and local services are running.

MySQL Community Edition is the freely downloadable MySQL distribution. Keycloak is an open-source identity and access-management service supporting OpenID Connect. Official references are listed at the end. [1] [2]

## What you will install

You will install four things:

1. **MySQL Community Server** for Northstar’s database.
2. **Docker Desktop or another local container runtime** for Keycloak and MinIO. Docker’s license terms vary by organization size and use, so check them if this is a company computer. You can use another compatible container runtime if needed.
3. **Keycloak** for local login.
4. **Ollama** for a local model. This is optional if you only want to test the UI and database.

You will not need Cloudflare, Railway, Auth0, OpenAI, R2, or Manus for this local stack.

## Part 1 — Install MySQL Community Server on Windows

1. Open the official [MySQL Installer download page](https://dev.mysql.com/downloads/installer/). [1]
2. Download **MySQL Community Server** or the MySQL Installer for Windows.
3. Start the installer.
4. Choose the developer or server installation option.
5. Keep the default port `3306` unless another database already uses it.
6. During setup, choose a root password and save it somewhere private.
7. Let the installer configure MySQL as a Windows service.
8. Open Command Prompt and test the installation:

```cmd
mysql --version
```

9. Log in as root:

```cmd
mysql -u root -p
```

10. At the MySQL prompt, create a separate Northstar database and user. Replace `NorthstarLocalPassword123!` with your own private password:

```sql
CREATE DATABASE northstar_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'northstar_user'@'localhost' IDENTIFIED BY 'NorthstarLocalPassword123!';
GRANT ALL PRIVILEGES ON northstar_local.* TO 'northstar_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Do not use the Atlas database. Do not use the MySQL root account in Northstar’s `.env` file.

Your local database value will be:

```env
DATABASE_URL=mysql://northstar_user:NorthstarLocalPassword123%21@127.0.0.1:3306/northstar_local
```

The exclamation mark is URL-encoded as `%21`. If your password contains other URL-reserved characters, encode them or choose a local password that is easy to place safely in a URL.

## Part 2 — Install a local container runtime

The easiest beginner route is Docker Desktop for Windows. Download it from [Docker Desktop](https://www.docker.com/products/docker-desktop/), install it, and restart Windows if requested. Start Docker Desktop and wait until it says it is running.

If Docker Desktop is not licensed for your organization, use another local container runtime that supports Docker Compose commands. Do not download random executable files from unofficial websites.

Verify it in Command Prompt:

```cmd
docker --version
docker compose version
```

## Part 3 — Start Keycloak for local login

Create a folder outside the Northstar repository so local service files do not get committed accidentally:

```cmd
mkdir "%USERPROFILE%\northstar-local-services"
cd /d "%USERPROFILE%\northstar-local-services"
```

Create a file named `docker-compose.yml` with this content:

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    command: start-dev
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: change-this-admin-password
    ports:
      - "8080:8080"
```

Replace `change-this-admin-password` with a private administrator password. Do not commit this file to the Northstar GitHub repository.

Start Keycloak:

```cmd
docker compose up -d keycloak
```

Open:

```text
http://localhost:8080
```

Choose **Administration Console** and sign in with:

```text
Username: admin
Password: the-password-you-put-in-docker-compose.yml
```

### Create a Keycloak realm

A realm is a separate identity space. Create one named:

```text
northstar
```

Do not use the `master` realm for Northstar users.

### Create a Northstar client

Inside the `northstar` realm:

1. Open **Clients**.
2. Select **Create client**.
3. Set **Client type** to `OpenID Connect`.
4. Set **Client ID** to `northstar-local`.
5. Use **Standard flow** / authorization code flow.
6. Set the valid redirect URI exactly to:

```text
http://localhost:3004/api/oauth/callback
```

7. Set the web origin to:

```text
http://localhost:3004
```

8. Keep the client confidential if Northstar’s server performs the code exchange.
9. Copy the generated client secret from the **Credentials** tab. Keep it private.

Keycloak’s issuer URL for this realm is:

```text
http://localhost:8080/realms/northstar
```

The authorization endpoint is:

```text
http://localhost:8080/realms/northstar/protocol/openid-connect/auth
```

The token endpoint is:

```text
http://localhost:8080/realms/northstar/protocol/openid-connect/token
```

### Create a local user

1. Open **Users** in the `northstar` realm.
2. Select **Add user**.
3. Enter your local username and email.
4. Save the user.
5. Open the **Credentials** tab.
6. Set a password.
7. Turn off temporary password if you do not want to be asked to change it on first login.

For local testing, you can create users directly in Keycloak. Password reset emails will not work until you configure SMTP; this is normal for an offline local setup.

## Part 4 — Start MinIO for private local object storage

Northstar’s external storage adapter expects an S3-compatible service. MinIO supplies that locally.

From `%USERPROFILE%\northstar-local-services`, add this service to `docker-compose.yml`:

```yaml
  minio:
    image: quay.io/minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: northstar_minio_admin
      MINIO_ROOT_PASSWORD: change-this-minio-password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  minio_data:
```

Use a private password, then start MinIO:

```cmd
docker compose up -d minio
```

Open the MinIO console at:

```text
http://localhost:9001
```

Sign in with the values from the compose file. Create a bucket named:

```text
northstar-local
```

Keep the bucket private. Do not enable anonymous or public access.

For a first local test, use the MinIO root access values in `.env`. For a more secure setup, create a separate MinIO service account with only access to the `northstar-local` bucket and use that account instead.

## Part 5 — Optional: install Ollama for a local model

If you want real model-backed answers without an API bill:

1. Install Ollama from [ollama.com](https://ollama.com/).
2. Open Command Prompt.
3. Download a model that your computer can handle, for example:

```cmd
ollama pull llama3.2:3b
```

4. Confirm Ollama is running:

```cmd
ollama list
```

Northstar can use an OpenAI-compatible local endpoint if its adapter accepts the Ollama API shape. Configure:

```env
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_API_KEY=ollama-local
LLM_MODEL=llama3.2:3b
```

Local models are not automatically as capable as hosted models, and model output formatting can vary. Run Northstar’s tests and use harmless requests first. If the local model does not satisfy the structured-output format, keep the model feature disabled until the adapter is adjusted; do not silently trust malformed output.

## Part 6 — Configure Northstar’s `.env`

Open the Northstar folder:

```cmd
cd /d "C:\Users\win 10\Desktop\northstar-operations-agent"
copy .env.example .env
notepad .env
```

For the local-only stack, use this configuration shape:

```env
NODE_ENV=development
PORT=3004

DATABASE_URL=mysql://northstar_user:YOUR_DATABASE_PASSWORD@127.0.0.1:3306/northstar_local
JWT_SECRET=GENERATE_A_LONG_RANDOM_LOCAL_SECRET

VITE_AUTH_PROVIDER=oidc
VITE_OIDC_ISSUER_URL=http://localhost:8080/realms/northstar
VITE_OIDC_CLIENT_ID=northstar-local
VITE_OIDC_SCOPE=openid profile email

OIDC_ISSUER_URL=http://localhost:8080/realms/northstar
OIDC_CLIENT_ID=northstar-local
OIDC_CLIENT_SECRET=THE_KEYCLOAK_CLIENT_SECRET
OIDC_REDIRECT_URI=http://localhost:3004/api/oauth/callback

OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_API_KEY=ollama-local
LLM_MODEL=llama3.2:3b

S3_ENDPOINT=http://127.0.0.1:9000
S3_REGION=us-east-1
S3_BUCKET=northstar-local
S3_ACCESS_KEY_ID=northstar_minio_admin
S3_SECRET_ACCESS_KEY=THE_MINIO_PASSWORD
```

Generate the local session secret with:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Replace every value beginning with `YOUR_`, `GENERATE_`, `THE_`, or `change-`. Do not use the literal placeholder values.

You can leave the old Manus variables empty or remove them if the external OIDC branch is enabled and the provider-neutral adapter is configured. Do not leave two different login providers half-configured. Northstar should use one explicit authentication mode at a time.

## Part 7 — Apply the Northstar database schema

Make sure MySQL is running and `.env` points to `northstar_local`. From the Northstar folder:

```cmd
pnpm install
pnpm drizzle-kit migrate
```

If migration reports an authentication error, verify the username, password, database name, and port. If it reports that the database does not exist, repeat the MySQL `CREATE DATABASE` command from Part 1.

## Part 8 — Start and test Northstar

Run:

```cmd
pnpm check
pnpm test
pnpm dev
```

Or double-click:

```text
START_NORTHSTAR_LOCAL.bat
```

Open:

```text
http://localhost:3004
```

Select sign in. You should be redirected to Keycloak at `localhost:8080`. Sign in with the local user you created, then Northstar should redirect back to `http://localhost:3004`.

Perform these safe checks in order:

| Check | Expected result |
|---|---|
| Northstar home page | Loads over `localhost`. |
| Sign in | Redirects to Keycloak and returns to Northstar. |
| Agent Desk | Shows a protected workspace for the local user. |
| Evidence Desk | Loads without exposing another user’s data. |
| Database | Run, trace, and audit records are written to `northstar_local`. |
| Storage | Uploaded synthetic test files go to the private MinIO bucket. |
| Public access | `http://localhost:9000` is not used as a public document URL. |
| Model | A harmless local request returns or safely refuses. |
| Shutdown | `docker compose down` stops Keycloak and MinIO without deleting volumes. |

## Part 9 — Backups and the meaning of “permanent”

Local services are not automatically backed up. Create a backup routine before using important information.

For MySQL, make a backup folder outside the repository and run:

```cmd
mkdir "%USERPROFILE%\northstar-backups"
mysqldump -u northstar_user -p northstar_local > "%USERPROFILE%\northstar-backups\northstar_local.sql"
```

Keep backups encrypted and separate from the computer. Do not commit `.sql` files to GitHub. For MinIO, back up its Docker volume or use the MinIO client to copy objects to an encrypted backup disk. For Keycloak, export the realm configuration only when you understand which secrets are included, and never upload the export publicly.

A local setup can be kept indefinitely, but it is not immortal. A disk failure, ransomware, forgotten password, Windows update, or deleted Docker volume can destroy it. “Free” means no hosted service invoice for the software; it does not mean no hardware, electricity, backup, or maintenance cost.

## Security rules

Keep Northstar bound to localhost while it has no strong external access gateway. Do not port-forward `3004`, Keycloak `8080`, MinIO `9000`, or MinIO console `9001` to the internet. Do not enable public bucket access. Do not use real firm documents until authentication, memory visibility, audit behavior, backups, and recovery have been tested.

Do not commit `.env`, `docker-compose.yml` containing passwords, MySQL dumps, MinIO data, Keycloak exports, or raw logs. The public Northstar repository must contain only placeholders and public-safe documentation.

## References

[1]: https://dev.mysql.com/downloads/installer/ "MySQL Installer for Windows"
[2]: https://www.keycloak.org/getting-started/getting-started-docker "Keycloak Docker getting started"
[3]: https://www.keycloak.org/securing-apps/oidc-layers "Keycloak OpenID Connect layers and authorization code flow"
[4]: https://ollama.com/ "Ollama local model runtime"
[5]: https://min.io/ "MinIO S3-compatible object storage"
