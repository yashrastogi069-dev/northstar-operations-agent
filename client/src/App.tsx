import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Controls from "./pages/Controls";
import Evaluation from "./pages/Evaluation";
import Guide from "./pages/Guide";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Sources from "./pages/Sources";
import Workflows from "./pages/Workflows";

function Router() {
  return <DashboardLayout><Switch>
    <Route path="/" component={Home} />
    <Route path="/sources" component={Sources} />
    <Route path="/workflows" component={Workflows} />
    <Route path="/evaluation" component={Evaluation} />
    <Route path="/controls" component={Controls} />
    <Route path="/guide" component={Guide} />
    <Route component={NotFound} />
  </Switch></DashboardLayout>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
