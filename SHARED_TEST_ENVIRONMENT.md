# Northstar Shared Test Environment Record

**Date:** August 28, 2026  
**Purpose:** Controlled technical testing only. This is not Northstar’s production deployment.

## Database result

Northstar’s additive agent schema was tested against the user-authorized managed database currently attached to the completed Atlas project. The existing Atlas tables were inspected first and were left intact. Migrations `0002` through `0005` added nine Northstar-prefixed tables: `agentRuns`, `agentStateSnapshots`, `agentToolCalls`, `agentApprovals`, `agentArtifacts`, `agentMemories`, `agentIntegrations`, `agentEvaluationResults`, and `agentRunFeedback`.

The `agentRuns` table contains the tested recovery-lineage field `recoveryOfRunId`. No production firm documents, credentials, integration records, or test agent runs were inserted during schema verification.

## Authentication boundary result

The built Northstar service started successfully against the managed test-database environment and served the Northstar sign-in page at a temporary test URL. Starting sign-in correctly redirected to the existing managed OAuth application, whose login screen identifies the inherited **Firm Knowledge Agent** application. A direct unauthenticated request to Northstar’s protected `agent.capabilities` procedure returned **HTTP 401**, confirming that the live protected route rejects unauthenticated traffic.

The available automated browser session does not share the user’s separately completed login, so it cannot demonstrate an authenticated Northstar workflow against the inherited identity. Therefore, this test verifies the protected boundary but does not establish a standalone Northstar identity or complete browser-level authenticated functional testing.

> A separate Northstar managed project remains required for production. It must have its own OAuth identity and database; migrations `0000` through `0005` should then be applied to that new database rather than the shared test database.

## Safety boundary

The shared test database is appropriate only for validating that Northstar’s additive `agent*` table namespace coexists with the older application. It is not a substitute for tenant isolation, independent OAuth branding, separate migration history, or dedicated deployment monitoring.
