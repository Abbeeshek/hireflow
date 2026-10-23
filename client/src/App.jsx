import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';

// Layouts
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './layouts/ProtectedRoute.jsx';

// Public Pages
import LandingPage from './pages/public/LandingPage.jsx';
import JobsPage from './pages/public/JobsPage.jsx';
import JobDetailPage from './pages/public/JobDetailPage.jsx';
import LoginPage from './pages/public/LoginPage.jsx';
import RegisterPage from './pages/public/RegisterPage.jsx';
import ForbiddenPage from './pages/public/ForbiddenPage.jsx';
import NotFoundPage from './pages/public/NotFoundPage.jsx';

// Candidate Pages
import CandidateDashboard from './pages/candidate/CandidateDashboard.jsx';
import ProfilePage from './pages/candidate/ProfilePage.jsx';
import ResumesPage from './pages/candidate/ResumesPage.jsx';

// Recruiter Pages
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard.jsx';
import RecruiterJobsPage from './pages/recruiter/RecruiterJobsPage.jsx';
import JobFormPage from './pages/recruiter/JobFormPage.jsx';
import JobApplicantsPage from './pages/recruiter/JobApplicantsPage.jsx';
import ApplicationDetailPage from './pages/recruiter/ApplicationDetailPage.jsx';
import CompareCandidatesPage from './pages/recruiter/CompareCandidatesPage.jsx';

// Admin Pages
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1A1136',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 500
              },
              success: {
                iconTheme: {
                  primary: '#1FA971',
                  secondary: '#FFFFFF'
                }
              },
              error: {
                iconTheme: {
                  primary: '#D9534F',
                  secondary: '#FFFFFF'
                }
              }
            }}
          />

          <Routes>
            <Route element={<MainLayout />}>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/403" element={<ForbiddenPage />} />

              {/* Candidate Routes */}
              <Route element={<ProtectedRoute allowedRoles={['candidate']} />}>
                <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
                <Route path="/candidate/profile" element={<ProfilePage />} />
                <Route path="/candidate/resumes" element={<ResumesPage />} />
              </Route>

              {/* Recruiter Routes */}
              <Route element={<ProtectedRoute allowedRoles={['recruiter']} />}>
                <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
                <Route path="/recruiter/jobs" element={<RecruiterJobsPage />} />
                <Route path="/recruiter/jobs/new" element={<JobFormPage />} />
                <Route path="/recruiter/jobs/:id/edit" element={<JobFormPage />} />
                <Route path="/recruiter/jobs/:id/applicants" element={<JobApplicantsPage />} />
                <Route path="/recruiter/jobs/:id/compare" element={<CompareCandidatesPage />} />
                <Route path="/recruiter/applications/:id" element={<ApplicationDetailPage />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
