import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ChatBot from "@/components/chatbot";

import Login from "./pages/login";
import Admin from "./pages/Admin";
import Hospital from "./pages/Hospital";
import Home from "./pages/Home";
import DonorProfile from "./pages/DonorProfile";

// Protected Route
function ProtectedRoute({
  component: Component,
  allowedRole,
}: {
  component: React.ComponentType;
  allowedRole?: string;
}) {
  const [, setLocation] = useLocation();
  const userId   = localStorage.getItem("userId");
  const userRole = localStorage.getItem("userRole");

  if (!userId) {
    setLocation("/");
    return null;
  }

  if (allowedRole && userRole !== allowedRole) {
    if (userRole === "admin")         setLocation("/admin");
    else if (userRole === "hospital") setLocation("/hospital");
    else                              setLocation("/home");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} allowedRole="admin" />}
      </Route>
      <Route path="/hospital">
        {() => <ProtectedRoute component={Hospital} allowedRole="hospital" />}
      </Route>
      <Route path="/home">
        {() => <ProtectedRoute component={Home} allowedRole="donor" />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={DonorProfile} allowedRole="donor" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ChatBotWrapper() {
  const [location] = useLocation();
  if (location === "/") return null;
  return <ChatBot />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <ChatBotWrapper />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;