import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowUp, BookOpen, CheckCircle2, FileText, Loader2, MessageSquareText, Plus, Quote, ShieldCheck, ThumbsDown, ThumbsUp, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Citation = { number: number; documentId: number; documentTitle: string; sourceId: number; sourceName: string; excerpt: string; confidence: number };
type AgentMode = "answer" | "compare" | "draft" | "plan";

const modes: Array<{ id: AgentMode; label: string; helper: string; icon: typeof MessageSquareText }> = [
  { id: "answer", label: "Evidence answer", helper: "Cited answer from approved sources", icon: MessageSquareText },
  { id: "compare", label: "Compare", helper: "Find agreements and conflicts", icon: Quote },
  { id: "draft", label: "Draft", helper: "Internal-only, review required", icon: WandSparkles },
  { id: "plan", label: "Plan", helper: "Controlled next steps", icon: FileText },
];

function citationList(value: unknown): Citation[] {
  return Array.isArray(value) ? value.filter((item): item is Citation => typeof item === "object" && item !== null && "documentTitle" in item) : [];
}

function EvidenceSeal({ label = "Verified" }: { label?: string }) {
  return <span className="evidence-seal"><CheckCircle2 className="size-3" />{label}</span>;
}

export default function Home() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<AgentMode>("answer");
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [lastResponse, setLastResponse] = useState<{ messageId: number; citations: Citation[]; status: string; answer: string } | null>(null);
  const workspace = trpc.knowledge.workspace.useQuery();
  const sources = trpc.knowledge.sources.list.useQuery();
  const conversations = trpc.knowledge.conversations.list.useQuery();
  const messages = trpc.knowledge.conversations.messages.useQuery({ conversationId: conversationId ?? 0 }, { enabled: Boolean(conversationId) });
  const ask = trpc.knowledge.ask.useMutation({
    onSuccess: result => {
      setConversationId(result.conversationId);
      setLastResponse({ messageId: result.messageId, citations: result.citations, status: result.status, answer: result.answer });
      setQuestion("");
      void utils.knowledge.conversations.list.invalidate();
      void utils.knowledge.conversations.messages.invalidate();
      void utils.knowledge.workspace.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const feedback = trpc.knowledge.feedback.useMutation({ onSuccess: () => toast.success("Feedback recorded. Thank you."), onError: error => toast.error(error.message) });
  const draft = trpc.knowledge.workflows.create.useMutation({ onSuccess: () => { toast.success("Draft sent to the human review queue."); void utils.knowledge.workflows.list.invalidate(); void utils.knowledge.workspace.invalidate(); }, onError: error => toast.error(error.message) });
  const sourceNames = useMemo(() => sources.data?.filter(source => source.approvalStatus === "approved").map(source => source.name) ?? [], [sources.data]);
  const displayMessages = messages.data ?? [];
  const activeMode = modes.find(item => item.id === mode) ?? modes[0];
  const hasApprovedSources = sourceNames.length > 0;

  const askQuestion = (value = question) => {
    const clean = value.trim();
    if (!clean || ask.isPending) return;
    ask.mutate({ question: clean, conversationId, mode });
  };
  const createNewChat = () => { setConversationId(undefined); setLastResponse(null); setQuestion(""); };

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <section className="evidence-hero relative overflow-hidden rounded-[1.75rem] px-6 py-7 text-white shadow-[0_24px_70px_-42px_rgba(24,59,47,.8)] md:px-8 md:py-8">
      <div className="evidence-grid absolute inset-0 opacity-40" /><div className="absolute -right-20 -top-24 size-80 rounded-full bg-[#61b585]/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><div className="flex items-center gap-2"><EvidenceSeal label="Evidence-first workspace" /><span className="text-[10px] font-medium tracking-[.15em] text-[#a9cfb6] uppercase">Internal use</span></div><h1 className="mt-4 font-serif text-[2.1rem] leading-[1.08] tracking-tight md:text-[2.7rem]">Ask the firm.<br /><span className="text-[#c9efd4]">See the evidence.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#d4e7da]">Atlas searches only approved knowledge, ranks the strongest passages, and keeps every operational step under human control.</p></div><div className="evidence-hero-stats grid grid-cols-3 divide-x divide-[#90b89d]/45 rounded-2xl border border-[#7ca38a]/45 bg-[#0e2d23]/50 backdrop-blur-sm"><div className="px-5 py-3"><p className="font-serif text-2xl">{workspace.data?.approvedSources ?? "—"}</p><p className="mt-0.5 text-[10px] text-[#b7d7c0]">Approved sources</p></div><div className="px-5 py-3"><p className="font-serif text-2xl">{workspace.data?.readyDocuments ?? "—"}</p><p className="mt-0.5 text-[10px] text-[#b7d7c0]">Evidence files</p></div><div className="px-5 py-3"><p className="font-serif text-2xl">{workspace.data?.pendingDrafts ?? "—"}</p><p className="mt-0.5 text-[10px] text-[#b7d7c0]">Review items</p></div></div></div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-[1.5rem] border border-[#dbe5dc] bg-white shadow-[0_18px_45px_-38px_rgba(35,59,45,.55)]">
        <div className="flex flex-col gap-4 border-b border-[#e6ece6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="evidence-mark evidence-mark-sm" aria-hidden="true"><span>AE</span></div><div><p className="text-sm font-semibold text-[#243b2f]">Knowledge agent</p><p className="text-[11px] text-[#718076]">Hybrid retrieval · citations required</p></div></div><div className="flex items-center gap-2"><Badge className={hasApprovedSources ? "border-[#b9ddc4] bg-[#eff8f1] text-[10px] font-semibold text-[#357952]" : "border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700"}>{hasApprovedSources ? `${sourceNames.length} approved source${sourceNames.length === 1 ? "" : "s"}` : "Evidence setup required"}</Badge><Button variant="ghost" size="sm" onClick={createNewChat} className="h-8 gap-1.5 rounded-lg text-xs text-[#426453]"><Plus className="size-3.5" />New chat</Button></div></div>
        <div className="min-h-[460px] bg-[linear-gradient(140deg,#fff_0%,#fbfdfb_55%,#f4f8f4_100%)] p-4 sm:p-6">
          {!displayMessages.length && !ask.isPending ? <div className="grid min-h-[375px] place-items-center"><div className="max-w-lg text-center"><div className="evidence-stamp mx-auto"><BookOpen className="size-5" /><span>Source-bound</span></div><h2 className="mt-5 font-serif text-[1.75rem] text-[#243b2f]">Begin with a governed question.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718076]">Atlas can answer, compare, draft, or plan—but a reliable result starts with an approved source boundary and evidence your firm trusts.</p>{!hasApprovedSources ? <div className="evidence-onboarding mx-auto mt-6 max-w-md text-left"><div><span>01</span><p><strong>Set the boundary</strong><br />Create a source with an owner, classification, and audience.</p></div><div><span>02</span><p><strong>Approve the evidence</strong><br />Upload reviewed documents, then explicitly approve the source.</p></div><div><span>03</span><p><strong>Test before expansion</strong><br />Add representative questions in Evaluation Lab before wider use.</p></div></div> : <div className="mt-6 flex flex-wrap justify-center gap-2">{["What is our approved travel policy?", "Compare the onboarding procedure with the security standard.", "Draft an internal summary of the client escalation procedure."].map(prompt => <button key={prompt} onClick={() => askQuestion(prompt)} className="rounded-lg border border-[#dce7df] bg-white px-3 py-2 text-left text-[11px] text-[#547061] transition hover:border-[#76aa87] hover:bg-[#f3faf5]">{prompt}</button>)}</div>}</div></div> : <div className="space-y-5">{displayMessages.map(message => { const citations = citationList(message.citationPayload); const isAssistant = message.role === "assistant"; return <article key={message.id} className={isAssistant ? "max-w-3xl" : "ml-auto max-w-2xl"}><div className={isAssistant ? "rounded-2xl border border-[#dce8de] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(34,66,45,.7)]" : "rounded-2xl bg-[#e4f3e9] p-4 text-[#254838]"}><div className="mb-2 flex items-center gap-2"><span className={isAssistant ? "grid size-5 place-items-center rounded-md bg-[#e6f4e9] text-[#357957]" : "grid size-5 place-items-center rounded-md bg-white/70 text-[#357957]"}>{isAssistant ? <BookOpen className="size-3" /> : <MessageSquareText className="size-3" />}</span><span className="text-[10px] font-semibold tracking-wide text-[#718276] uppercase">{isAssistant ? "Evidence response" : "Your question"}</span>{isAssistant && message.status === "insufficient_evidence" ? <Badge variant="outline" className="ml-auto border-amber-200 bg-amber-50 text-[9px] text-amber-700">Needs source</Badge> : null}</div><p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p></div>{isAssistant && citations.length ? <div className="citation-ledger mt-2 grid gap-2 sm:grid-cols-2">{citations.map(citation => <div key={citation.number} className="rounded-xl border border-[#e1e9e3] bg-[#fbfdfb] p-3"><div className="flex items-start justify-between gap-3"><p className="text-[11px] font-semibold text-[#2e513d]"><span className="mr-1 text-[#347d52]">[{citation.number}]</span>{citation.documentTitle}</p><span className="shrink-0 text-[10px] text-[#6e8b79]">{citation.confidence}% match</span></div><p className="mt-1.5 line-clamp-3 text-[11px] leading-5 text-[#6a776e]">{citation.excerpt}</p><p className="mt-2 text-[10px] font-medium text-[#59806a]">{citation.sourceName}</p></div>)}</div> : null}</article>})}{ask.isPending ? <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#9ac3a6] bg-[#f4faf5] p-4 text-sm text-[#527060]"><Loader2 className="size-4 animate-spin text-[#2e7b4f]" />Checking approved sources, ranking evidence, and preparing citations…</div> : null}</div>}</div>
        <div className="border-t border-[#e6ece6] bg-white p-4 sm:p-5"><div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{modes.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setMode(item.id)} className={`rounded-xl border px-3 py-2.5 text-left transition ${mode === item.id ? "border-[#7ebd93] bg-[#eaf7ed] text-[#24573c] shadow-[inset_3px_0_0_#2f7b4f]" : "border-[#e2e9e3] bg-white text-[#6b7c70] hover:bg-[#f7faf7]"}`}><span className="flex items-center gap-1.5 text-[11px] font-semibold"><Icon className="size-3.5" />{item.label}</span><span className="mt-0.5 block text-[9px] opacity-75">{item.helper}</span></button>})}</div><div className="flex gap-3"><Textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); askQuestion(); } }} placeholder={`Ask in ${activeMode.label.toLowerCase()} mode…`} className="min-h-[54px] resize-none rounded-xl border-[#dce7df] bg-[#fcfefc] px-4 py-3 text-sm focus-visible:ring-[#4b9867]" /><Button onClick={() => askQuestion()} disabled={!question.trim() || ask.isPending} className="h-auto min-h-[54px] w-12 rounded-xl bg-[#17372f] text-white hover:bg-[#0e2a22]"><ArrowUp className="size-4" /></Button></div><p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#779082]"><ShieldCheck className="size-3.5 text-[#438960]" />Answers are source-bound. Any external action remains blocked.</p></div>
      </section>
      <aside className="space-y-4"><Card className="evidence-control-card rounded-[1.25rem] border-[#dbe5dc] bg-white shadow-[0_18px_38px_-36px_rgba(35,59,45,.5)]"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="eyebrow">Retrieval contract</p><h2 className="mt-1 font-serif text-xl text-[#263c31]">Bounded by design</h2></div><EvidenceSeal label="Live" /></div><div className="mt-5 space-y-3">{[["Approved evidence", "Only explicitly approved sources can enter retrieval."], ["Role boundary", "Access rules apply before the answer model sees a passage."], ["Human authority", "Drafts await a reviewer; no outside system can be changed."]].map(([label, description]) => <div key={label} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#37915a]" /><div><p className="text-xs font-semibold text-[#345042]">{label}</p><p className="mt-0.5 text-[10px] leading-4 text-[#7b8b80]">{description}</p></div></div>)}</div></CardContent></Card>
        <Card className="rounded-[1.25rem] border-[#dbe5dc] bg-[#f0f7f2]"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="eyebrow text-[#548267]">Conversation ledger</p><span className="text-[9px] font-semibold tracking-wide text-[#5c816a] uppercase">Private</span></div><div className="mt-3 space-y-1">{conversations.data?.slice(0, 5).map(item => <button key={item.id} onClick={() => { setConversationId(item.id); setLastResponse(null); }} className={`w-full rounded-lg px-2.5 py-2 text-left text-xs transition ${conversationId === item.id ? "bg-white text-[#244734] shadow-sm" : "text-[#547061] hover:bg-white/70"}`}>{item.title}</button>) ?? <div className="rounded-lg border border-dashed border-[#c5decc] bg-white/55 px-3 py-4 text-[11px] leading-5 text-[#6f8375]">Your question history and response evidence will appear here.</div>}</div></CardContent></Card>
        {lastResponse ? <Card className="rounded-[1.25rem] border-[#dbe5dc] bg-white"><CardContent className="p-5"><p className="eyebrow">Response review</p><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={() => feedback.mutate({ messageId: lastResponse.messageId, rating: "helpful" })} className="h-8 flex-1 gap-1 rounded-lg border-[#dce7df] text-[11px]"><ThumbsUp className="size-3" />Useful</Button><Button variant="outline" size="sm" onClick={() => feedback.mutate({ messageId: lastResponse.messageId, rating: "not_helpful" })} className="h-8 flex-1 gap-1 rounded-lg border-[#dce7df] text-[11px]"><ThumbsDown className="size-3" />Not enough</Button></div><Button variant="ghost" onClick={() => feedback.mutate({ messageId: lastResponse.messageId, rating: "serious_issue", comment: "User flagged a serious issue for review." })} className="mt-2 h-7 w-full text-[10px] text-red-700 hover:bg-red-50 hover:text-red-800">Report serious issue</Button>{mode === "draft" || mode === "plan" ? <Button onClick={() => draft.mutate({ title: `${mode === "draft" ? "Internal draft" : "Controlled plan"}: ${question || "Evidence response"}`.slice(0, 190), draftType: mode === "draft" ? "response" : "summary", content: lastResponse.answer, sourceMessageId: lastResponse.messageId })} disabled={draft.isPending} className="mt-3 h-8 w-full rounded-lg bg-[#17372f] text-[11px] hover:bg-[#0e2a22]">Send to review queue</Button> : null}</CardContent></Card> : null}</aside>
    </div>
  </div>;
}
