// src/AppRouter.tsx
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { RootLayout } from './components/layout/RootLayout';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { AdminPage } from './pages/AdminPage';
import { LandingPage } from './pages/LandingPage';

/**
 * PUBLIC ROUTES LAYOUT
 * If the user is authenticated, this layout redirects them to the main dashboard.
 * If they are a guest, it renders the requested public page (Login, Register, Landing).
 */
function PublicLayout() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

/**
 * PRIVATE ROUTES LAYOUT
 * This is the main gatekeeper. If the user is NOT authenticated, it redirects them to login.
 * If they ARE authenticated, it renders the main application shell and then decides which
 * page to show based on the URL and user role.
 */
function PrivateLayout() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // This is the core logic. Render the main app shell (Header, etc.).
  // The <Outlet> inside RootLayout is where the specific child route will be rendered.
  return <RootLayout />;
}

/**
 * ADMIN GUARD
 * Protects a specific route *within* the private layout.
 */
function AdminGuard() {
  const { user } = useAuth();
  return user?.globalStatus === 'ADMIN' ? <AdminPage /> : <Navigate to="/admin" replace />;
}

const router = createBrowserRouter([
  // --- PUBLIC ROUTES GROUP ---
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // --- PRIVATE ROUTES GROUP ---
  {
    element: <PrivateLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/workspace/:workspaceId', element: <WorkspacePage /> },
      { path: '/admin', element: <AdminGuard /> }, // Admin page is protected here
    ],
  },
  
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}