import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClassroomManager from "./pages/ClassroomManager";
import KioskModeSelect from "./pages/KioskModeSelect";
import KioskClassSelect from "./pages/KioskClassSelect";
import KioskMode from "./pages/KioskMode";
import KioskAttendance from "./pages/KioskAttendance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/classroom" element={<ClassroomManager />} />
            <Route path="/kiosk" element={<KioskModeSelect />} />
            <Route path="/kiosk/:mode/select" element={<KioskClassSelect />} />
            <Route path="/kiosk/speed" element={<KioskMode />} />
            <Route path="/kiosk/attendance" element={<KioskAttendance />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
