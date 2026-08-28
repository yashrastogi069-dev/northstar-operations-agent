# Northstar Evidence Desk

## Independent Atlas-derived capability

Northstar now includes a separately named **Evidence Desk**. It is an independent capability copy of the completed Atlas Evidence Agent’s evidence-first behavior; it is not a merge, shared runtime, shared database, or shared deployment. Atlas remains independently maintained at its own repository and deployment.

The Evidence Desk is intentionally part of the Northstar product because the operations agent needs a reliable way to answer business questions from approved firm evidence. It provides a direct source-bound workspace for users who need evidence answers, source comparison, internal drafts, or controlled research plans.

| Capability | Northstar implementation | Authority boundary |
|---|---|---|
| Evidence answers | `knowledge.ask` with approved-source retrieval and citations | The model receives only authorized evidence passages. |
| Comparison | Evidence comparison mode | Conflicts remain visible; the agent does not invent a resolution. |
| Internal drafts | Draft mode and review-queue handoff | Drafts are labeled internal and require human review. |
| Controlled plans | Plan mode with approval checkpoints | A plan does not authorize an external action. |
| Source governance | Admin-only source creation, approval, archival, and access levels | A source becomes retrievable only after explicit approval. |
| Secure ingestion | Bounded PDF, DOCX, spreadsheet, CSV, text, Markdown, and JSON processing | Size, type, extraction, audit, and failure handling are enforced. |
| Hybrid retrieval | Keyword ranking, semantic-term expansion, reranking, and optional guarded vector adapter | Authorization filtering happens before evidence reaches the answer model. |
| Feedback and audits | Owner-authorized feedback, severity escalation, and audit events | Safety concerns remain traceable without exposing credentials. |

## Navigation and product relationship

The Northstar shell has two distinct primary workspaces:

- **Agent Desk** is the supervised operations workflow for business requests, bounded tool planning, research, structured analysis, drafts, approvals, and recovery.
- **Evidence Desk** is the evidence-first workspace for approved-source questions, citations, comparisons, source-bound drafts, and evidence governance.

Source administration remains available through the Knowledge route for administrators. Run Traces, Approvals, Memory, Evaluations, and Safety Controls remain Northstar-wide operational surfaces.

## Independence guarantees

Atlas application source, schema, routes, database, and deployment are not modified by this addition. The Atlas working tree contains unrelated pre-existing checklist entries for the Northstar project, which were not created by this Evidence Desk change. Northstar does not import Atlas’s environment files, OAuth credentials, uploaded documents, database exports, raw audit traces, or user data. Northstar’s Evidence Desk uses Northstar’s own route contracts, database records, authentication context, and storage configuration. The public repository contains source and documentation only.

Atlas and Northstar may evolve at different speeds. The copied capability is therefore treated as a deliberate Northstar implementation snapshot, with parity and authorization tests maintained in Northstar rather than an implicit live dependency on Atlas. Future Atlas improvements must be explicitly reviewed before being reproduced in Northstar.

## Verification boundary

The new route is `/evidence` and is protected by the same authentication boundary as the rest of Northstar. Type checking, the existing evidence and workflow tests, and the production build pass after the route and navigation addition. Full authenticated UI verification, including a real Evidence Desk question and mobile review, remains a deployment-stage check because the current temporary test service uses the inherited managed identity rather than an independent production identity.
