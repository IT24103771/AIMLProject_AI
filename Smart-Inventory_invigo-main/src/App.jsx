import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Staff from "./pages/Staff";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import DiscountsPage from "./pages/DiscountsPage";
import InventoryPage from "./pages/InventoryPage";
import Products from "./pages/Products";
import NotificationsPage from "./pages/NotificationsPage";
import MailsAdminPage from "./pages/MailsAdminPage";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN"]}>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/*"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "STAFF"]}>
                <Staff />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "STAFF"]}>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/discounts"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "STAFF"]}>
                <DiscountsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "STAFF"]}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "STAFF"]}>
                <Products />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "STAFF"]}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mails"
            element={
              <ProtectedRoute allowedRoles={["OWNER", "ADMIN"]}>
                <MailsAdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;