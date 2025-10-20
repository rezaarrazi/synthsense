import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { apolloClient } from "./lib/apolloClient";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => (
  <ApolloProvider client={apolloClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* Admin page removed */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </ApolloProvider>
);

export default App;
