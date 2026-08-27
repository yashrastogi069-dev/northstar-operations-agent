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
import { BookOpenText, Bot, ChevronRight, ClipboardCheck, Database, LogOut, ShieldCheck, Workflow } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const primaryItems = [
  { icon: Bot, label: "Knowledge agent", path: "/" },
  { icon: Database, label: "Approved sources", path: "/sources", admin: true },
  { icon: Workflow, label: "Draft workflow", path: "/workflows" },
  { icon: ClipboardCheck, label: "Evaluation lab", path: "/evaluation", admin: true },
];

const secondaryItems = [
  { icon: ShieldCheck, label: "Audit & controls", path: "/controls", admin: true },
  { icon: BookOpenText, label: "Implementation guide", path: "/guide" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7f7f4] grid place-items-center p-5">
        <section className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-9 text-center shadow-[0_28px_80px_-38px_rgba(26,39,32,0.5)]">
          <div className="evidence-mark evidence-mark-lg mx-auto mb-6" aria-hidden="true"><span>AE</span></div>
          <p className="eyebrow">Firm intelligence</p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-[#17372f]">A private workspace for trusted answers.</h1>
          <p className="mt-4 text-sm leading-6 text-stone-600">Sign in to access approved knowledge sources, evidence-backed responses, and controlled internal drafts.</p>
          <Button onClick={() => startLogin()} className="mt-7 w-full bg-[#17372f] text-white hover:bg-[#0f2a23]">Sign in securely <ChevronRight className="size-4" /></Button>
        </section>
      </div>
    );
  }

  const visiblePrimary = primaryItems.filter(item => !item.admin || user.role === "admin");
  const visibleSecondary = secondaryItems.filter(item => !item.admin || user.role === "admin");
  const renderItems = (items: typeof primaryItems) => items.map(item => {
    const active = location === item.path;
    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton isActive={active} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-xl px-3 text-[13px] transition-colors data-[active=true]:bg-[#dff5e8] data-[active=true]:text-[#17372f] hover:bg-[#f1f4f1]">
          <item.icon className="size-4" /> <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-[#dce5dd] bg-[#fbfcfa]">
        <SidebarHeader className="h-20 px-3 pt-4">
          <div className="flex items-center gap-2.5 px-1.5 group-data-[collapsible=icon]:justify-center">
            <div className="evidence-mark" aria-hidden="true"><span>AE</span></div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-serif text-base font-semibold tracking-tight text-[#17372f]">Atlas Evidence</p>
              <p className="text-[10px] font-medium tracking-[0.16em] text-[#668176] uppercase">Firm workspace</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <p className="sidebar-label group-data-[collapsible=icon]:hidden">Workspace</p>
          <SidebarMenu>{renderItems(visiblePrimary)}</SidebarMenu>
          <div className="my-5 border-t border-[#e3e9e4]" />
          <p className="sidebar-label group-data-[collapsible=icon]:hidden">Governance</p>
          <SidebarMenu>{renderItems(visibleSecondary)}</SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <div className="rounded-xl border border-[#e2e9e2] bg-white p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
              <Avatar className="size-8 border border-[#dce5dd]"><AvatarFallback className="bg-[#e9f4ec] text-xs font-semibold text-[#255743]">{user.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-[#24362d]">{user.name ?? "Team member"}</p><Badge variant="secondary" className="mt-1 h-4 rounded-md bg-[#edf3ed] px-1.5 text-[9px] font-medium text-[#4f6b5c] capitalize">{user.role}</Badge></div>
              <button onClick={logout} aria-label="Sign out" className="grid size-7 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 group-data-[collapsible=icon]:hidden"><LogOut className="size-3.5" /></button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f7f7f4]">
        <header className="flex h-16 items-center justify-between border-b border-[#e2e8e2] bg-[#f7f7f4]/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><SidebarTrigger className="grid size-8 place-items-center rounded-lg text-[#557262] hover:bg-[#eaf1eb]" /><span className="hidden text-xs text-[#708477] sm:inline">{isMobile ? "Firm workspace" : "Evidence ledger · human-controlled workflows"}</span></div>
          <div className="flex items-center gap-2"><span className="hidden rounded-full border border-[#c8ddcf] bg-[#e6f5eb] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#286145] uppercase sm:inline">Evidence mode</span><span className="size-2 rounded-full bg-[#3b9b61] shadow-[0_0_0_3px_rgba(59,155,97,0.12)]" /></div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
