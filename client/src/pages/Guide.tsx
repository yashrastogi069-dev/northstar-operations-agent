import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BookOpenText, CheckCircle2, Database, FileCheck2, ScanSearch, ShieldCheck, Workflow } from "lucide-react";

const pipeline = [
  ["01", "Curate", "An administrator creates a source boundary, declares classification and audience, and explicitly approves it."],
  ["02", "Ingest", "The workspace stores the original file in secure object storage, extracts supported text, and prepares searchable passages."],
  ["03", "Retrieve", "At question time, the service checks the user’s role, searches only eligible passages, combines keyword and semantic-term relevance, then reranks evidence."],
  ["04", "Answer", "The model receives a bounded evidence set and must cite it. When evidence is weak or absent, the agent declines rather than guessing."],
  ["05", "Control", "Drafts, feedback, evaluations, and key events are retained for human review. External activity is intentionally disabled."],
];

const guardrails = [
  ["Approved source gate", "Unapproved, archived, or inaccessible sources do not enter retrieval."],
  ["Evidence-bound instructions", "Retrieved content is treated as reference material, never as instructions for the agent."],
  ["Insufficient-evidence response", "The agent states that it lacks sufficient approved evidence rather than inventing an answer."],
  ["Human-controlled operations", "The workflow produces drafts; approval never sends, writes, or updates an external system."],
  ["Audited feedback", "Serious issues are recorded in the audit trail and notify the designated project owner."],
];

export default function Guide() {
  return <div className="mx-auto max-w-[1180px] space-y-7">
    <section className="guide-hero"><div className="guide-hero-mark"><BookOpenText className="size-5" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="eyebrow text-[#b9d8c2]">Implementation brief</p><Badge className="border-[#78a88a]/60 bg-[#123728]/45 text-[9px] text-[#d4eddb]">Firm pilot playbook</Badge></div><h1>How this knowledge agent stays<br className="hidden md:block" /> useful, traceable, and controlled.</h1><p>Use this operating brief to guide the first firm pilot. Begin with a narrow, approved knowledge set and one workflow where a human remains accountable for every real-world outcome.</p></div><div className="guide-hero-ledger"><span>Operating principle</span><strong>Evidence before output.<br />Human authority before action.</strong></div></section>

    <section><div className="section-ledger-heading"><div><p className="eyebrow">Traceable RAG pipeline</p><h2>Five governed stages</h2></div><p>Each stage has a clear owner, input, and control.</p></div><div className="guide-pipeline mt-4">{pipeline.map(([number, title, description], index) => <Card key={number} className="guide-stage"><CardContent className="p-4"><div className="flex items-center justify-between"><span>{number}</span>{index < pipeline.length - 1 ? <ArrowRight className="size-3.5 text-[#83a790]" /> : <CheckCircle2 className="size-3.5 text-[#3d8e5d]" />}</div><h3>{title}</h3><p>{description}</p></CardContent></Card>)}</div></section>

    <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr]"><Card className="evidence-register"><CardContent className="p-6"><div className="register-heading"><div><p className="eyebrow">Trust controls</p><h2>Guardrails in the current build</h2></div><ShieldCheck className="size-5 text-[#418b5d]" /></div><div className="mt-5 space-y-4">{guardrails.map(([title, description], index) => <div key={title} className="guide-guardrail"><span>{String(index + 1).padStart(2, "0")}</span><div><p>{title}</p><small>{description}</small></div></div>)}</div></CardContent></Card>
      <Card className="evidence-panel evidence-panel-mint"><CardContent className="p-6"><div className="panel-title"><span className="panel-index">QA</span><div><p className="eyebrow">Validation before scale</p><h2>Testing before expansion</h2></div></div><p className="panel-intro">A reliable agent needs a firm-specific test suite—not generic benchmarks. Create questions that test direct answers, ambiguity, disagreement, missing evidence, and permission boundaries.</p><div className="mt-5 space-y-2">{[["Retrieval", "Did the expected source appear in evidence?"], ["Behavior", "Did it answer or decline as required?"], ["Grounding", "Are claims supportable by cited passages?"], ["Review", "Would a named subject-matter reviewer accept it?"]].map(([label, question]) => <div key={label} className="guide-check"><ScanSearch className="size-3.5" /><div><p>{label}</p><small>{question}</small></div></div>)}</div></CardContent></Card></div>

    <section><div className="section-ledger-heading"><div><p className="eyebrow">Connection readiness</p><h2>Expand only after validation</h2></div><p>Every first integration remains read-only or draft-only.</p></div><p className="mt-2 max-w-3xl text-sm leading-6 text-[#6c7d71]">Choose one system after the core pilot validates. Define a source owner, select the narrowest practical access scope, and add evaluation cases drawn from actual firm work before expanding the connection.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[["SharePoint", "Read approved document libraries only. Map existing SharePoint permissions to retrieval access."], ["Google Drive", "Read selected shared drives or folders only. Exclude personal drives and unapproved folders."], ["CRM", "Start with read-only lookup and create a draft record-update proposal instead of writing back."], ["Slack or Teams", "Draft a response or summary for human review. Do not post automatically in the first stage."], ["Identity provider", "Use SSO and role/group mapping before granting wider firm access."], ["Document governance", "Name source owners, review dates, and archival rules for each knowledge collection."]].map(([name, description]) => <Card key={name} className="connection-card"><CardContent className="p-4"><div className="flex items-center gap-2"><Database className="size-3.5 text-[#468d60]" /><p>{name}</p></div><p>{description}</p><Badge variant="outline">Read-only / draft-only</Badge></CardContent></Card>)}</div></section>

    <section className="guide-decision-gate"><div className="grid size-10 place-items-center rounded-xl border border-[#82b293]/50 bg-[#0d3023]"><Workflow className="size-5 text-[#c7ead1]" /></div><div><p>Pilot decision gate</p><h2>Expand only when the evidence, review, and control checks are working.</h2></div><Badge>Human ownership retained</Badge></section>
  </div>;
}
