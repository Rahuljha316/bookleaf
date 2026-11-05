import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Layouts
import { AuthorLayout } from '@/layouts/AuthorLayout';
import { AdminLayout } from '@/layouts/AdminLayout';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { AuthorDashboard } from '@/pages/author/AuthorDashboard';
import { CreateTicketPage } from '@/pages/author/CreateTicketPage';
import { AuthorTicketsPage } from '@/pages/author/AuthorTicketsPage';
import { AuthorTicketDetailPage } from '@/pages/author/AuthorTicketDetailPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminTicketsPage } from '@/pages/admin/AdminTicketsPage';
import { AdminTicketDetailPage } from '@/pages/admin/AdminTicketDetailPage';

import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

/** Root redirect handler based on authenticated user's role */
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Loading BookLeaf Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'admin' ? '/admin' : '/author'} replace />;
};

/** 404 Fallback page */
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 mb-4">
        <BookOpen className="w-6 h-6" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">404 — Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <a href="/">Return to Home</a>
      </Button>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Author Portal Protected Routes */}
          <Route
            path="/author"
            element={
              <ProtectedRoute allowedRoles={['author']}>
                <AuthorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AuthorDashboard />} />
            <Route path="tickets" element={<AuthorTicketsPage />} />
            <Route path="tickets/new" element={<CreateTicketPage />} />
            <Route path="tickets/:id" element={<AuthorTicketDetailPage />} />
          </Route>

          {/* Admin Portal Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="tickets" element={<AdminTicketsPage />} />
            <Route path="tickets/:id" element={<AdminTicketDetailPage />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
