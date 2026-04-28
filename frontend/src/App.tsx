import { useEffect } from "react";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ChequesPage } from "@/pages/ChequesPage";
import { ChequesScanPage } from "@/pages/ChequesScanPage";
import { ChequesCalendarPage } from "@/pages/ChequesCalendarPage";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { SupplierDetailPage } from "@/pages/SupplierDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Pas de retry — le refresh est géré par l'intercepteur Axios
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <ErrorBoundary><DashboardPage /></ErrorBoundary> },
          { path: "projets", element: <ErrorBoundary><ProjectsPage /></ErrorBoundary> },
          { path: "projets/:id", element: <ErrorBoundary><ProjectDetailPage /></ErrorBoundary> },
          { path: "transactions", element: <ErrorBoundary><TransactionsPage /></ErrorBoundary> },
          { path: "cheques", element: <ErrorBoundary><ChequesPage /></ErrorBoundary> },
          { path: "cheques/scan", element: <ErrorBoundary><ChequesScanPage /></ErrorBoundary> },
          { path: "cheques/calendrier", element: <ErrorBoundary><ChequesCalendarPage /></ErrorBoundary> },
          { path: "fournisseurs", element: <ErrorBoundary><SuppliersPage /></ErrorBoundary> },
          { path: "fournisseurs/:id", element: <ErrorBoundary><SupplierDetailPage /></ErrorBoundary> },
          { path: "rapports", element: <ErrorBoundary><ReportsPage /></ErrorBoundary> },
          { path: "parametres", element: <ErrorBoundary><SettingsPage /></ErrorBoundary> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  // Filet de sécurité : nettoie tout résidu de scroll-lock laissé par
  // un Modal/Drawer/Sidebar lors d'un HMR ou d'un démontage anormal.
  useEffect(() => {
    document.body.style.overflow = "";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
