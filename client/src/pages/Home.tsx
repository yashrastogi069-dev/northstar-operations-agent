import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  FileCheck2,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
} from "lucide-react";
import { useState } from "react";

const fallbackStarters = [
  { icon: Search, label: "Research brief", text: "Research the current background on sustainable aviation fuel and prepare an internal briefing." },
  { icon: BrainCircuit, label: "Firm knowledge", text: "What does our approved travel policy say about international client meetings?" },
  { icon: Table2, label: "Data analysis", text: "Analyse the supplied data and prepare an internal summary." },
  { icon: FileCheck2, label: "Draft with review", text: "Prepare and send a client project-status update." },
];

export default function Home() {
  const [request, setRequest] = useState("");
  const [dataText, setDataText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const capabilities = trpc.agent.capabilities.useQuery();
  const workflowTemplates = trpc.agent.workflows.templates.useQuery();
  const run = trpc.agent.runs.start.useMutation({
    onSuccess: nextResult => {
      setResult(nextResult);
      setFeedbackSent(null);
    },
  });
  const feedback = trpc.agent.feedback.create.useMutation({
    onSuccess: (_data, variables) => setFeedbackSent(variables.rating),
  });
  const runTask = (allowPublicResearch = false) => run.mutate({ request, allowPublicResearch, ...(dataText.trim() ? { dataText } : {}) });

  const workflowStarters = workflowTemplates.data?.map(template => ({
    icon: template.id === "research_brief" ? Search : template.id === "document_analysis" ? BrainCircuit : template.id === "operational_triage" ? Table2 : FileCheck2,
    label: template.title,
    text: template.request,
  })) ?? fallbackStarters;

  return (
    <div className="mx-auto max-w-[1420px] space-y-6">
      <section className="northstar-hero relative overflow-hidden rounded-[1.9rem] px-6 py-8 text-white shadow-[0_26px_76px_-42px_rgba(0,0,0,.95)] md:px-8 md:py-10">
        <div className="northstar-grid absolute inset-0 opacity-45" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <p className="northstar-kicker">Supervised operations</p>
            <h1 className="mt-4 max-w-2xl font-serif text-[2.35rem] leading-[1.05] tracking-tight text-white md:text-5xl">Turn a complex task into a <span className="text-amber-200">traceable next step.</span></h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-100">Northstar assesses risk, selects bounded tools, retains explicit context, recovers safely from transient failure, and stops for named human approval.</p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-cyan-100/20 bg-cyan-100/15">
            <div className="bg-[#0a1e28]/80 p-4"><p className="font-serif text-3xl text-white">{capabilities.data?.tools.length ?? "—"}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-200">Registered tools</p></div>
            <div className="bg-[#0a1e28]/80 p-4"><p className="font-serif text-3xl text-white">4</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-200">Agent modes</p></div>
            <div className="col-span-2 bg-[#0a1e28]/80 px-4 py-3 text-xs font-medium leading-5 text-amber-100">Every connected-system effect remains blocked until a named human approves a specific proposal.</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="northstar-surface p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="northstar-kicker">Task intake</p>
              <h2 className="mt-2 font-serif text-3xl text-white">What should Northstar work on?</h2>
            </div>
            <Badge className="northstar-status px-3 py-1.5">Policy first</Badge>
          </div>
          <Textarea
            value={request}
            onChange={event => setRequest(event.target.value)}
            placeholder="Ask the agent to retrieve approved knowledge, research a public fact, analyse structured data, or prepare an internal draft…"
            className="mt-6 min-h-[154px] resize-none rounded-2xl border p-4 text-base leading-6 shadow-none"
          />
          <details className="mt-3 rounded-xl px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold">Optional: paste CSV or tab-delimited data for local analysis</summary>
            <Textarea value={dataText} onChange={event => setDataText(event.target.value)} placeholder="team,spend&#10;North,1200" className="mt-3 min-h-24 bg-[#0b1821] text-sm" />
          </details>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {workflowStarters.map(({ icon: Icon, label, text }) => (
                <button key={label} onClick={() => setRequest(text)} className="northstar-chip inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold">
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
            <Button onClick={() => runTask()} disabled={!request.trim() || run.isPending} className="northstar-primary rounded-xl px-5 font-bold">
              {run.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}Run supervised task
            </Button>
          </div>
          {run.error && <p className="mt-4 flex gap-2 rounded-xl border border-red-300/35 bg-red-500/15 p-3 text-sm font-medium text-red-100"><AlertTriangle size={17} />{run.error.message}</p>}
        </div>

        <aside className="northstar-surface p-5">
          <p className="northstar-kicker">Execution contract</p>
          <h2 className="mt-2 font-serif text-2xl text-white">Bounded by design</h2>
          <div className="mt-5 space-y-3">
            {capabilities.data?.tools.map(tool => (
              <div key={tool.id} className="northstar-card p-3">
                <div className="flex justify-between gap-3"><strong className="text-sm capitalize text-white">{tool.id.replaceAll("_", " ")}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-cyan-100">{tool.mode}</span></div>
                <p className="mt-1 text-xs leading-5 text-slate-300">{tool.description}</p>
              </div>
            )) ?? <Loader2 className="animate-spin text-cyan-200" />}
          </div>
        </aside>
      </section>

      {result && (
        <section className="northstar-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="northstar-kicker">Run result</p>
              <p className="mt-2 max-w-3xl rounded-xl border border-[#304b57] bg-[#111f29] px-3 py-2 text-sm text-cyan-50"><span className="font-semibold text-cyan-200">Question:</span> {request}</p>
              <h2 className="mt-2 font-serif text-3xl text-white">{result.status === "blocked" ? "Run stopped safely" : result.status === "awaiting_approval" ? "Human review required" : "Evidence-led result"}</h2>
            </div>
            <Badge className={result.status === "blocked" ? "border border-red-300/30 bg-red-400/15 text-red-100" : result.status === "awaiting_approval" ? "border border-amber-300/35 bg-amber-300/15 text-amber-100" : "border border-emerald-300/35 bg-emerald-300/15 text-emerald-100"}>{String(result.status).replaceAll("_", " ")}</Badge>
          </div>
          {result.requiresPublicResearchConsent ? <div className="mt-5 rounded-xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50"><strong>Public research was not run.</strong> This request appears to ask for a public fact, but Northstar never searches the web silently. Confirm only if the request contains no confidential firm information, then Northstar will run the bounded public-reference search.<br /><Button onClick={() => runTask(true)} disabled={run.isPending} size="sm" className="mt-3 bg-amber-200 font-bold text-[#18262a] hover:bg-amber-100">{run.isPending ? "Searching…" : "Confirm public research"}</Button></div> : null}
          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-100">{result.result}</p>
          <div className="northstar-result mt-5 p-4 text-sm"><strong>Policy decision: </strong>{result.policyReason}</div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {result.tools.map((tool: any) => (
              <div key={tool.toolName} className="northstar-card p-4">
                <p className="flex items-center justify-between text-sm font-semibold"><span className="capitalize text-white">{tool.toolName.replaceAll("_", " ")}</span><span className="text-xs font-normal capitalize text-slate-300">{tool.status}</span></p>
                <p className="mt-2 text-sm text-slate-200">{tool.summary}</p>
                {tool.citations.map((citation: any) => <p key={`${citation.source}-${citation.title}`} className="mt-3 border-l-2 border-amber-300 pl-3 text-xs leading-5 text-slate-300"><strong className="text-amber-100">{citation.title}</strong> · {citation.source}<br />{citation.excerpt}</p>)}
              </div>
            ))}
          </div>
          <div className="northstar-feedback mt-5 flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="mr-1 text-xs font-semibold text-slate-100">Was this run useful?</span>
            {feedbackSent ? <span className="text-xs font-medium text-emerald-200">Feedback recorded: {feedbackSent.replaceAll("_", " ")}.</span> : <>
              <Button size="sm" variant="outline" className="border-[#496572] text-slate-100 hover:bg-[#23404b]" onClick={() => feedback.mutate({ runId: result.runId, rating: "helpful" })} disabled={feedback.isPending}>Helpful</Button>
              <Button size="sm" variant="outline" className="border-[#496572] text-slate-100 hover:bg-[#23404b]" onClick={() => feedback.mutate({ runId: result.runId, rating: "not_helpful" })} disabled={feedback.isPending}>Needs improvement</Button>
              <Button size="sm" variant="outline" className="border-red-300/45 text-red-100 hover:bg-red-500/15" onClick={() => feedback.mutate({ runId: result.runId, rating: "safety_concern" })} disabled={feedback.isPending}>Report safety concern</Button>
            </>}
          </div>
          {result.approvalId && <a href="/approvals" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-200 hover:text-amber-100">View required approval <ArrowRight size={16} /></a>}
        </section>
      )}

      <p className="flex items-center gap-2 rounded-xl border border-[#304b57] bg-[#111f29] px-4 py-3 text-xs font-medium text-slate-200"><ShieldCheck size={15} className="text-emerald-300" />No shell access, direct record change, destructive action, or external send is registered in this agent.</p>
    </div>
  );
}
