import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Approvals from "./pages/Approvals";
import Controls from "./pages/Controls";
import Evaluation from "./pages/Evaluation";
import EvidenceDesk from "./pages/EvidenceDesk";
import Guide from "./pages/Guide";
import Home from "./pages/Home";
import Memory from "./pages/Memory";
import NotFound from "./pages/NotFound";
import Runs from "./pages/Runs";
import Sources from "./pages/Sources";
import Workflows from "./pages/Workflows";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/evidence" component={EvidenceDesk} />
        <Route path="/runs" component={Runs} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/memory" component={Memory} />
        <Route path="/sources" component={Sources} />
        <Route path="/workflows" component={Workflows} />
        <Route path="/evaluation" component={Evaluation} />
        <Route path="/controls" component={Controls} />
        <Route path="/guide" component={Guide} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
