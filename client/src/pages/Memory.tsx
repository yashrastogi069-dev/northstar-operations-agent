import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BrainCircuit, Plus } from "lucide-react";
import { useState } from "react";

export default function Memory() {
  const [key, setKey] = useState(""); const [content, setContent] = useState("");
  const utils = trpc.useUtils(); const memory = trpc.agent.memory.list.useQuery();
  const create = trpc.agent.memory.create.useMutation({ onSuccess: () => { setKey(""); setContent(""); void utils.agent.memory.list.invalidate(); } });
  return <div className="mx-auto max-w-5xl space-y-6"><section><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#667a80]">Explicit context only</p><h1 className="mt-2 font-serif text-4xl text-[#173239]">Agent memory</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#61777c]">Memory is a controlled input to future runs. Northstar never stores retrieved passages, tool output, or user instructions as long-term memory automatically.</p></section><div className="grid gap-6 lg:grid-cols-[.78fr_1.22fr]"><section className="rounded-[1.5rem] border border-[#dce4df] bg-[#eaf1ee] p-5"><div className="flex gap-2"><BrainCircuit className="text-[#176447]" /><h2 className="font-serif text-2xl">Add explicit memory</h2></div><Input value={key} onChange={event => setKey(event.target.value)} placeholder="Memory label, e.g. Team vocabulary" className="mt-5 bg-white" /><Textarea value={content} onChange={event => setContent(event.target.value)} placeholder="A durable, approved fact or preference…" className="mt-3 min-h-36 bg-white" /><Button onClick={() => create.mutate({ key, content })} disabled={!key.trim() || !content.trim() || create.isPending} className="mt-3 w-full bg-[#173c42] hover:bg-[#0d3034]"><Plus className="mr-2 size-4" />Save explicit memory</Button></section><section className="space-y-3">{memory.data?.map(item => <article key={item.id} className="rounded-2xl border border-[#dce4df] bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-serif text-xl text-[#274046]">{item.key}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#60767a]">{item.content}</p></div><Badge variant="outline">{item.scope}</Badge></div><p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-[#7d9191]">{item.sensitivity} · explicit · active</p></article>) ?? <p className="rounded-2xl border border-dashed border-[#cfdcd6] p-10 text-center text-sm text-[#6b8084]">No explicit memory has been saved.</p>}</section></div></div>;
}
