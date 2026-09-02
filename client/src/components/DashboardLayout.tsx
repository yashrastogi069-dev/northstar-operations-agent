import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Activity,
  BookOpen,
  Bot,
  BrainCircuit,
  CheckSquare,
  Database,
  FileSearch,
  Gauge,
  History,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const workspace = [
  { icon: Bot, label: "Agent Desk", description: "Run supervised tasks", path: "/" },
  { icon: BookOpen, label: "Evidence Desk", description: "Ask approved knowledge", path: "/evidence" },
  { icon: History, label: "Run Traces", description: "Review agent activity", path: "/runs" },
  { icon: CheckSquare, label: "Approvals", description: "Human review queue", path: "/approvals" },
  { icon: BrainCircuit, label: "Memory", description: "Scoped context", path: "/memory" },
  { icon: Database, label: "Knowledge Sources", description: "Upload and govern sources", path: "/sources", admin: true },
];

const assurance = [
  { icon: Gauge, label: "Evaluations", description: "Measure behavior", path: "/evaluation", admin: true },
  { icon: ShieldCheck, label: "Safety Controls", description: "Review boundaries", path: "/controls", admin: true },
  { icon: FileSearch, label: "Operator Guide", description: "Learn the workflow", path: "/guide" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const mobile = useIsMobile();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#07131b] p-5 text-white">
        <section className="w-full max-w-lg rounded-[2rem] border border-cyan-100/15 bg-[#10232d] p-8 shadow-[0_28px_90px_-40px_rgba(0,0,0,.95)] md:p-10">
          <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl border border-amber-200/40 bg-amber-300/10 font-serif text-xl text-amber-100">N</div><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">Northstar Operations</p><p className="mt-1 text-xs text-slate-400">Firm knowledge and supervised workflows</p></div></div>
          <h1 className="mt-10 max-w-md font-serif text-4xl leading-tight text-white">A clearer path from question to accountable action.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">Retrieve approved knowledge, analyze structured information, and prepare reviewable work without losing the human decision point.</p>
          <Button onClick={startLogin} className="northstar-primary mt-8 h-12 w-full rounded-xl font-bold">Sign in securely</Button>
        </section>
      </main>
    );
  }

  const render = (items: typeof workspace) => items.filter(item => !item.admin || user.role === "admin").map(item => {
    const active = item.path === "/" ? location === "/" : location.startsWith(item.path);
    return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={active} onClick={() => setLocation(item.path)} tooltip={item.label} className="group h-auto min-h-12 rounded-xl px-3 py-2.5 text-left text-slate-200 transition-colors data-[active=true]:bg-[#1d4654] data-[active=true]:text-white hover:bg-[#17323e] hover:text-white"><item.icon className="mt-0.5 size-4 shrink-0" /><span className="min-w-0 group-data-[collapsible=icon]:hidden"><span className="block text-[13px] font-semibold">{item.label}</span><span className="mt-0.5 block text-[10px] font-normal text-slate-400 group-data-[state=expanded]:group-data-[active=true]:text-cyan-100/80">{item.description}</span></span>{item.path === "/approvals" && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-amber-300" />}</SidebarMenuButton></SidebarMenuItem>;
  });

  const pageTitle = [...workspace, ...assurance].find(item => item.path === location || (item.path !== "/" && location.startsWith(item.path)))?.label ?? "Northstar";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-[#24414d] bg-[#091821] text-slate-100">
        <SidebarHeader className="h-[5.5rem] border-b border-[#1d3540] px-3 pt-4"><div className="flex items-center gap-3 px-1.5 group-data-[collapsible=icon]:justify-center"><div className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-200/40 bg-amber-300/10 font-serif text-lg text-amber-100">N</div><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate font-serif text-base font-semibold tracking-tight text-white">Northstar</p><p className="text-[10px] font-medium uppercase tracking-[.15em] text-cyan-100/65">Operations agent</p></div></div></SidebarHeader>
        <SidebarContent className="px-2 py-3"><p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200/70 group-data-[collapsible=icon]:hidden">Workspaces</p><SidebarMenu>{render(workspace)}</SidebarMenu><div className="my-4 border-t border-[#24414d]" /><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200/70 group-data-[collapsible=icon]:hidden">Assurance</p><SidebarMenu>{render(assurance)}</SidebarMenu></SidebarContent>
        <SidebarFooter className="border-t border-[#1d3540] p-3"><div className="rounded-xl border border-[#284753] bg-[#0e222c] p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"><div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"><Avatar className="size-8 border border-[#3a5864]"><AvatarFallback className="bg-[#1d4654] text-xs font-semibold text-cyan-50">{user.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-white">{user.name ?? "Operator"}</p><Badge className="mt-1 h-4 rounded-md border border-[#3a5864] bg-[#193542] px-1.5 text-[9px] font-medium capitalize text-slate-200">{user.role} access</Badge></div><button onClick={logout} aria-label="Sign out" className="grid size-7 place-items-center rounded-lg text-slate-300 transition hover:bg-[#284753] hover:text-white group-data-[collapsible=icon]:hidden"><LogOut className="size-3.5" /></button></div></div></SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#08151d]"><header className="flex min-h-16 items-center justify-between border-b border-[#213c48] bg-[#0b1b24]/95 px-4 backdrop-blur md:px-8"><div className="flex min-w-0 items-center gap-3"><SidebarTrigger className="grid size-8 shrink-0 place-items-center rounded-lg text-cyan-100 hover:bg-[#17323e]" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{pageTitle}</p><p className="hidden truncate text-[11px] text-slate-400 sm:block">{mobile ? "Supervised workspace" : "Evidence-led work · persisted state · human authority"}</p></div></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200 sm:inline">Policy gate online</span><Activity className="size-4 text-emerald-300" /></div></header><main className="northstar-workspace min-h-[calc(100vh-4rem)] p-4 md:p-8">{children}</main></SidebarInset>
    </SidebarProvider>
  );
}
