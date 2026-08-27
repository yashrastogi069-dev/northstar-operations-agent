import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, Bot, BrainCircuit, CheckSquare, Database, Gauge, History, LogOut, ShieldCheck } from "lucide-react";
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
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#07171b] p-5"><section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[.06] p-9 text-center text-white shadow-2xl"><span className="inline-grid size-12 place-items-center rounded-2xl bg-amber-300/15 text-xl text-amber-200">✦</span><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-amber-200">Northstar operations agent</p><h1 className="mt-3 font-serif text-3xl leading-tight">One guarded agent for serious knowledge work.</h1><p className="mt-4 text-sm leading-6 text-slate-300">Plan, retrieve, research, analyse, and draft—while keeping every consequential effect under human authority.</p><Button onClick={startLogin} className="mt-7 w-full bg-amber-300 font-semibold text-[#0b1b1e] hover:bg-amber-200">Sign in securely</Button></section></main>;
  const render = (items: typeof workspace) => items.filter(item => !item.admin || user.role === "admin").map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-xl px-3 text-[13px] text-slate-300 transition-colors data-[active=true]:bg-[#16424b] data-[active=true]:text-amber-200 hover:bg-white/5 hover:text-white"><item.icon className="size-4" /><span>{item.label}</span>{item.path === "/approvals" && <span className="ml-auto size-1.5 rounded-full bg-amber-300" />}</SidebarMenuButton></SidebarMenuItem>);
  return <SidebarProvider><Sidebar collapsible="icon" className="border-r border-white/10 bg-[#07171b] text-slate-200"><SidebarHeader className="h-20 px-3 pt-4"><div className="flex items-center gap-2.5 px-1.5 group-data-[collapsible=icon]:justify-center"><div className="grid size-9 place-items-center rounded-xl border border-amber-200/40 bg-amber-300/10 font-serif text-lg text-amber-200">N</div><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate font-serif text-base font-semibold tracking-tight text-white">Northstar</p><p className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Operations agent</p></div></div></SidebarHeader><SidebarContent className="px-2"><p className="sidebar-label mt-2 text-slate-500 group-data-[collapsible=icon]:hidden">Run workspace</p><SidebarMenu>{render(workspace)}</SidebarMenu><div className="my-5 border-t border-white/10" /><p className="sidebar-label text-slate-500 group-data-[collapsible=icon]:hidden">Assurance</p><SidebarMenu>{render(governance)}</SidebarMenu></SidebarContent><SidebarFooter className="p-3"><div className="rounded-xl border border-white/10 bg-white/[.05] p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"><div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"><Avatar className="size-8 border border-white/10"><AvatarFallback className="bg-[#16424b] text-xs font-semibold text-amber-100">{user.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-white">{user.name ?? "Operator"}</p><Badge className="mt-1 h-4 rounded-md border-0 bg-white/10 px-1.5 text-[9px] font-medium capitalize text-slate-300">{user.role}</Badge></div><button onClick={logout} aria-label="Sign out" className="grid size-7 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden"><LogOut className="size-3.5" /></button></div></div></SidebarFooter></Sidebar><SidebarInset className="bg-[#f2f5f4]"><header className="flex h-16 items-center justify-between border-b border-[#dae3df] bg-[#f6f8f7]/90 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><SidebarTrigger className="grid size-8 place-items-center rounded-lg text-[#496269] hover:bg-[#e5edeb]" /><span className="hidden text-xs text-[#61787d] sm:inline">{mobile ? "Supervised agent" : "Bounded tools · persisted state · human authority"}</span></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 sm:inline">Policy gate online</span><Activity className="size-4 text-emerald-600" /></div></header><main className="min-h-[calc(100vh-4rem)] p-4 md:p-8">{children}</main></SidebarInset></SidebarProvider>;
}
