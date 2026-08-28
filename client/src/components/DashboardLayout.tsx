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
  Bot,
  BrainCircuit,
  CheckSquare,
  Database,
  Gauge,
  History,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const workspace = [
  { icon: Bot, label: "Agent desk", path: "/" },
  { icon: History, label: "Run traces", path: "/runs" },
  { icon: CheckSquare, label: "Approvals", path: "/approvals" },
  { icon: BrainCircuit, label: "Memory", path: "/memory" },
  { icon: Database, label: "Knowledge", path: "/sources", admin: true },
];

const governance = [
  { icon: Gauge, label: "Evaluations", path: "/evaluation", admin: true },
  { icon: ShieldCheck, label: "Safety controls", path: "/controls", admin: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const mobile = useIsMobile();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#09141d] p-5 text-white">
        <section className="w-full max-w-md rounded-[2rem] border border-[#40606d] bg-[#142631] p-9 text-center shadow-[0_28px_90px_-40px_rgba(0,0,0,.95)]">
          <span className="inline-grid size-12 place-items-center rounded-2xl border border-amber-200/35 bg-amber-300/15 text-xl text-amber-100">✦</span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200">Northstar operations agent</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-white">One guarded agent for serious knowledge work.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-200">Plan, retrieve, research, analyse, and draft—while keeping every consequential effect under human authority.</p>
          <Button onClick={startLogin} className="northstar-primary mt-7 w-full font-bold">Sign in securely</Button>
        </section>
      </main>
    );
  }

  const render = (items: typeof workspace) =>
    items
      .filter(item => !item.admin || user.role === "admin")
      .map(item => (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            isActive={location === item.path}
            onClick={() => setLocation(item.path)}
            tooltip={item.label}
            className="h-11 rounded-xl px-3 text-[13px] text-slate-200 transition-colors data-[active=true]:bg-[#234a57] data-[active=true]:text-amber-100 hover:bg-[#1d3642] hover:text-white"
          >
            <item.icon className="size-4" />
            <span>{item.label}</span>
            {item.path === "/approvals" && <span className="ml-auto size-1.5 rounded-full bg-amber-300" />}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ));

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-[#2b4652] bg-[#0b161f] text-slate-100">
        <SidebarHeader className="h-20 px-3 pt-4">
          <div className="flex items-center gap-2.5 px-1.5 group-data-[collapsible=icon]:justify-center">
            <div className="grid size-9 place-items-center rounded-xl border border-amber-200/40 bg-amber-300/10 font-serif text-lg text-amber-100">N</div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-serif text-base font-semibold tracking-tight text-white">Northstar</p>
              <p className="text-[10px] font-medium uppercase tracking-[.16em] text-cyan-100/70">Operations agent</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <p className="mt-2 px-3 pb-2 pt-2 text-[9px] font-bold uppercase tracking-[.15em] text-slate-400 group-data-[collapsible=icon]:hidden">Run workspace</p>
          <SidebarMenu>{render(workspace)}</SidebarMenu>
          <div className="my-5 border-t border-[#2b4652]" />
          <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[.15em] text-slate-400 group-data-[collapsible=icon]:hidden">Assurance</p>
          <SidebarMenu>{render(governance)}</SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <div className="rounded-xl border border-[#2b4652] bg-[#111f29] p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
              <Avatar className="size-8 border border-[#3a5864]">
                <AvatarFallback className="bg-[#234a57] text-xs font-semibold text-cyan-50">{user.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-xs font-semibold text-white">{user.name ?? "Operator"}</p>
                <Badge className="mt-1 h-4 rounded-md border border-[#3a5864] bg-[#1f3540] px-1.5 text-[9px] font-medium capitalize text-slate-200">{user.role}</Badge>
              </div>
              <button onClick={logout} aria-label="Sign out" className="grid size-7 place-items-center rounded-lg text-slate-300 transition hover:bg-[#28424e] hover:text-white group-data-[collapsible=icon]:hidden">
                <LogOut className="size-3.5" />
              </button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#0c1821]">
        <header className="flex h-16 items-center justify-between border-b border-[#28434f] bg-[#0d1a23]/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="grid size-8 place-items-center rounded-lg text-cyan-100 hover:bg-[#1d3540]" />
            <span className="hidden text-xs font-medium text-slate-300 sm:inline">{mobile ? "Supervised agent" : "Bounded tools · persisted state · human authority"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200 sm:inline">Policy gate online</span>
            <Activity className="size-4 text-emerald-300" />
          </div>
        </header>
        <main className="northstar-workspace min-h-[calc(100vh-4rem)] p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
