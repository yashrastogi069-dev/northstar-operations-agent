import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, BrainCircuit, FileCheck2, Loader2, Search, ShieldCheck, Sparkles, Table2 } from "lucide-react";
import { useState } from "react";

const starters = [
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
    onSuccess: (nextResult) => {
      setResult(nextResult);
      setFeedbackSent(null);
    },
  });
  const feedback = trpc.agent.feedback.create.useMutation({
    onSuccess: (_data, variables) => setFeedbackSent(variables.rating),
  });
  const workflowStarters = workflowTemplates.data?.map(template => ({
    icon: template.id === "research_brief" ? Search : template.id === "document_analysis" ? BrainCircuit : template.id === "operational_triage" ? Table2 : FileCheck2,
    label: template.title,
    text: template.request,
  })) ?? starters;

  return (
    <div className="mx-auto max-w-[1420px] space-y-6">
      <section className="northstar-hero relative overflow-hidden rounded-[1.9rem] px-6 py-8 text-white shadow-[0_24px_70px_-42px_rgba(14,47,51,.9)] md:px-8 md:py-10">
        <div className="northstar-grid absolute inset-0 opacity-30" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-200">Supervised operations</p>
            <h1 className="mt-4 max-w-2xl font-serif text-[2.35rem] leading-[1.05] tracking-tight md:text-5xl">Turn a complex task into a <span className="text-amber-200">traceable next step.</span></h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Northstar uses a LangGraph state machine to assess risk, select bounded tools, retain explicit context, recover from transient failure, and stop for human approval.</p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/10">
            <div className="bg-[#0a252a]/75 p-4"><p className="font-serif text-2xl">{capabilities.data?.tools.length ?? "—"}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-slate-300">Registered tools</p></div>
            <div className="bg-[#0a252a]/75 p-4"><p className="font-serif text-2xl">4</p><p className="mt-1 text-[10px] uppercase tracking-wide text-slate-300">Agent modes</p></div>
            <div className="col-span-2 bg-[#0a252a]/75 px-4 py-3 text-xs text-amber-100">Every outside-system effect remains blocked until a named human approves a specific proposal.</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="rounded-[1.6rem] border border-[#d9e2de] bg-white p-5 shadow-[0_16px_45px_-38px_rgba(26,50,55,.7)] md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#667a80]">Task intake</p><h2 className="mt-2 font-serif text-3xl text-[#173239]">What should Northstar work on?</h2></div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Policy-first</Badge>
          </div>
          <Textarea value={request} onChange={event => setRequest(event.target.value)} placeholder="Ask the agent to retrieve approved knowledge, research a public fact, analyse structured data, or prepare an internal draft…" className="mt-6 min-h-[145px] resize-none rounded-2xl border-[#cedbd6] p-4 text-base shadow-none focus-visible:ring-[#b98535]" />
          <details className="mt-3 rounded-xl bg-[#f3f6f4] px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#42615b]">Optional: paste CSV or tab-delimited data for local analysis</summary>
            <Textarea value={dataText} onChange={event => setDataText(event.target.value)} placeholder="team,spend&#10;North,1200" className="mt-3 min-h-24 bg-white text-sm" />
          </details>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {workflowStarters.map(({ icon: Icon, label, text }) => <button key={label} onClick={() => setRequest(text)} className="inline-flex items-center gap-1.5 rounded-full bg-[#edf2ef] px-3 py-1.5 text-xs font-semibold text-[#38564e] transition hover:bg-[#dfe9e3]"><Icon size={13} />{label}</button>)}
            </div>
            <Button onClick={() => run.mutate({ request, ...(dataText.trim() ? { dataText } : {}) })} disabled={!request.trim() || run.isPending} className="rounded-xl bg-[#0d3338] px-5 hover:bg-[#174c4d]">
              {run.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}Run supervised task
            </Button>
          </div>
          {run.error && <p className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={17} />{run.error.message}</p>}
        </div>

        <aside className="rounded-[1.6rem] border border-[#d9e2de] bg-[#ebf1ee] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#667a80]">Execution contract</p>
          <div className="mt-5 space-y-3">
            {capabilities.data?.tools.map(tool => <div key={tool.id} className="rounded-2xl border border-white/80 bg-white/85 p-3"><div className="flex justify-between gap-3"><strong className="text-sm capitalize text-[#263e42]">{tool.id.replaceAll("_", " ")}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-[#6e8387]">{tool.mode}</span></div><p className="mt-1 text-xs leading-5 text-[#64777b]">{tool.description}</p></div>) ?? <Loader2 className="animate-spin text-[#5d777b]" />}
          </div>
        </aside>
      </section>

      {result && (
        <section className="rounded-[1.6rem] border border-[#d6e3db] bg-white p-6 shadow-[0_16px_45px_-38px_rgba(26,50,55,.7)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#667a80]">Run result</p><h2 className="mt-2 font-serif text-3xl text-[#173239]">{result.status === "blocked" ? "Run stopped safely" : result.status === "awaiting_approval" ? "Human review required" : "Evidence-led result"}</h2></div>
            <Badge className={result.status === "blocked" ? "bg-red-100 text-red-700" : result.status === "awaiting_approval" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-700"}>{String(result.status).replaceAll("_", " ")}</Badge>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#263e42]">{result.result}</p>
          <div className="mt-5 rounded-2xl bg-[#f3f6f4] p-4 text-sm text-[#42615b]"><strong>Policy decision: </strong>{result.policyReason}</div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {result.tools.map((tool: any) => <div key={tool.toolName} className="rounded-2xl border border-[#e0e8e3] p-4"><p className="flex items-center justify-between text-sm font-semibold text-[#2c4548]"><span className="capitalize">{tool.toolName.replaceAll("_", " ")}</span><span className="text-xs font-normal capitalize text-[#687c80]">{tool.status}</span></p><p className="mt-2 text-sm text-[#60767a]">{tool.summary}</p>{tool.citations.map((citation: any) => <p key={`${citation.source}-${citation.title}`} className="mt-3 border-l-2 border-amber-300 pl-3 text-xs leading-5 text-[#53676b]"><strong>{citation.title}</strong> · {citation.source}<br />{citation.excerpt}</p>)}</div>)}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-[#f8faf8] px-4 py-3">
            <span className="mr-1 text-xs font-semibold text-[#4e6668]">Was this run useful?</span>
            {feedbackSent ? <span className="text-xs text-emerald-700">Feedback recorded: {feedbackSent.replaceAll("_", " ")}.</span> : <><Button size="sm" variant="outline" onClick={() => feedback.mutate({ runId: result.runId, rating: "helpful" })} disabled={feedback.isPending}>Helpful</Button><Button size="sm" variant="outline" onClick={() => feedback.mutate({ runId: result.runId, rating: "not_helpful" })} disabled={feedback.isPending}>Needs improvement</Button><Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => feedback.mutate({ runId: result.runId, rating: "safety_concern" })} disabled={feedback.isPending}>Report safety concern</Button></>}
          </div>
          {result.approvalId && <a href="/approvals" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#9b702f]">View required approval <ArrowRight size={16} /></a>}
        </section>
      )}

      <p className="flex items-center gap-2 text-xs text-[#60767a]"><ShieldCheck size={15} className="text-emerald-600" />No shell access, direct record change, destructive action, or external send is registered in this agent.</p>
    </div>
  );
}
