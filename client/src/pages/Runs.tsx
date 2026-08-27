import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Clock3, Loader2, RefreshCw, Route, Wrench } from "lucide-react";
import { useState } from "react";

export default function Runs() {
  const [selected, setSelected] = useState<number | null>(null);
  const runs = trpc.agent.runs.list.useQuery({ limit: 60 });
  const detail = trpc.agent.runs.get.useQuery({ runId: selected ?? 0 }, { enabled: Boolean(selected) });
  const utils = trpc.useUtils();
  const retry = trpc.agent.runs.retry.useMutation({
    onSuccess: async (nextRun) => {
      setSelected(nextRun.runId);
      await utils.agent.runs.list.invalidate();
    },
  });

  return (
    <div className="mx-auto max-w-[1420px] space-y-6">
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#667a80]">Operational observability</p>
        <h1 className="mt-2 font-serif text-4xl text-[#173239]">Run traces</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#61777c]">Every Northstar run retains its policy decision, graph-state transitions, bounded tool calls, retries, output, and review status. The trace excludes secrets and raw credential values.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-[1.5rem] border border-[#d9e2de] bg-white p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-2xl">Recent runs</h2><Badge variant="outline">{runs.data?.length ?? "—"} retained</Badge></div>
          {runs.isLoading ? <Loader2 className="m-5 animate-spin" /> : <div className="space-y-2">{runs.data?.map(run => <button key={run.id} onClick={() => setSelected(run.id)} className={`w-full rounded-xl border p-4 text-left transition ${selected === run.id ? "border-[#94b9aa] bg-[#edf5f1]" : "border-[#e1e8e4] hover:bg-[#f7faf8]"}`}><div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm font-semibold text-[#284248]">{run.title}</p><Badge className={run.status === "blocked" || run.status === "failed" ? "bg-red-100 text-red-700" : run.status === "awaiting_approval" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}>{run.status.replaceAll("_", " ")}</Badge></div><p className="mt-2 text-[11px] text-[#6b8084]">{run.taskType} · risk: {run.riskTier} · {new Date(run.createdAt).toLocaleString()}</p></button>) ?? <p className="p-6 text-sm text-[#6b8084]">No agent runs yet.</p>}</div>}
        </section>

        <section className="min-h-[540px] rounded-[1.5rem] border border-[#d9e2de] bg-white p-5">
          {!selected ? <div className="grid min-h-[500px] place-items-center text-center"><Route className="size-8 text-[#83a39a]" /><div><h2 className="mt-3 font-serif text-2xl">Select a run trace</h2><p className="mt-2 max-w-sm text-sm text-[#6b8084]">Use the agent desk to start a task. Its bounded path will be visible here.</p></div></div> : detail.isLoading ? <Loader2 className="m-6 animate-spin" /> : detail.data ? <div>
            <div className="flex items-start justify-between gap-4 border-b border-[#e4ebe7] pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#667a80]">{detail.data.run.threadId}</p><h2 className="mt-2 font-serif text-3xl">{detail.data.run.title}</h2></div><Badge>{detail.data.run.status.replaceAll("_", " ")}</Badge></div>
            {detail.data.run.status === "failed" && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Recovery is deliberately a new, audited run—not a replay of prior side effects.</p>{detail.data.run.taskType === "analysis" ? <p className="mt-1 text-xs leading-5 text-amber-800">This tabular-data run cannot be replayed because raw inputs are not retained. Submit the task and data again from Agent Desk.</p> : <div className="mt-3 flex flex-wrap items-center gap-3"><Button size="sm" onClick={() => retry.mutate({ runId: detail.data.run.id })} disabled={retry.isPending}><RefreshCw className={`mr-2 size-3.5 ${retry.isPending ? "animate-spin" : ""}`} />Start controlled recovery</Button>{retry.error && <span className="text-xs text-red-700">{retry.error.message}</span>}</div>}</div>}
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div><p className="mb-3 text-xs font-bold uppercase tracking-[.15em] text-[#667a80]">Graph transitions</p><div className="space-y-2">{detail.data.snapshots.map(snapshot => <div key={snapshot.id} className="flex items-center gap-3 rounded-xl bg-[#f2f6f3] p-3"><span className="grid size-6 place-items-center rounded-full bg-[#173c42] text-[10px] font-bold text-amber-100">{snapshot.sequence}</span><div><p className="text-sm font-semibold capitalize">{snapshot.node}</p><p className="text-[11px] text-[#61777c]">{new Date(snapshot.createdAt).toLocaleTimeString()}</p></div><ChevronRight className="ml-auto size-4 text-[#93a5a5]" /></div>)}</div></div>
              <div><p className="mb-3 text-xs font-bold uppercase tracking-[.15em] text-[#667a80]">Tool ledger</p><div className="space-y-2">{detail.data.toolCalls.map(call => <div key={call.id} className="rounded-xl border border-[#e1e8e4] p-3"><div className="flex items-center gap-2"><Wrench className="size-4 text-[#9b702f]" /><p className="text-sm font-semibold capitalize">{call.toolName.replaceAll("_", " ")}</p><span className="ml-auto text-[10px] uppercase text-[#657d80]">{call.status}</span></div><p className="mt-2 text-xs leading-5 text-[#647a7d]">{call.outputSummary ?? call.inputSummary}</p>{call.durationMs !== null && <p className="mt-2 flex items-center gap-1 text-[10px] text-[#829497]"><Clock3 size={11} />{call.durationMs} ms</p>}</div>)}</div></div>
            </div>
            {detail.data.run.result && <div className="mt-6 rounded-2xl bg-[#f4f7f5] p-5"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#667a80]">Final result</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#294349]">{detail.data.run.result}</p></div>}
            {detail.data.feedback.length > 0 && <p className="mt-5 text-xs text-[#61777c]">{detail.data.feedback.length} feedback signal{detail.data.feedback.length === 1 ? "" : "s"} recorded for this run.</p>}
          </div> : <p>Run not found.</p>}
        </section>
      </div>
    </div>
  );
}
