import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Briefcase,
  Layers,
  FileText,
  User,
  LogOut,
  Shield,
  PlusCircle,
  BarChart2,
  Users
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout, isCandidate, isRecruiter, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-indigo flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading text-xl font-bold text-ink tracking-tight">Hire</span>
            <span className="font-heading text-xl font-bold text-indigo tracking-tight">Flow</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link
            to="/jobs"
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition ${
              isActive('/jobs')
                ? 'text-indigo bg-indigo-50 font-semibold'
                : 'text-slate-600 hover:text-ink hover:bg-slate-50'
            }`}
          >
            Browse Jobs
          </Link>

          {/* Candidate Links */}
          {isAuthenticated && isCandidate && (
            <>
              <Link
                to="/candidate/dashboard"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition ${
                  isActive('/candidate/dashboard')
                    ? 'text-indigo bg-indigo-50 font-semibold'
                    : 'text-slate-600 hover:text-ink hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                Applications
              </Link>
              <Link
                to="/candidate/resumes"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition ${
                  isActive('/candidate/resumes')
                    ? 'text-indigo bg-indigo-50 font-semibold'
                    : 'text-slate-600 hover:text-ink hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Resumes
              </Link>
              <Link
                to="/candidate/profile"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition ${
                  isActive('/candidate/profile')
                    ? 'text-indigo bg-indigo-50 font-semibold'
                    : 'text-slate-600 hover:text-ink hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
            </>
          )}

          {/* Recruiter Links */}
          {isAuthenticated && isRecruiter && (
            <>
              <Link
                to="/recruiter/dashboard"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition ${
                  isActive('/recruiter/dashboard')
                    ? 'text-indigo bg-indigo-50 font-semibold'
                    : 'text-slate-600 hover:text-ink hover:bg-slate-50'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/recruiter/jobs"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition ${
                  isActive('/recruiter/jobs')
                    ? 'text-indigo bg-indigo-50 font-semibold'
                    : 'text-slate-600 hover:text-ink hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                My Jobs
              </Link>
              <Link
                to="/recruiter/jobs/new"
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo hover:bg-indigo-hover rounded-lg shadow-sm transition ml-2"
              >
                <PlusCircle className="w-4 h-4" />
                Post Job
              </Link>
            </>
          )}

          {/* Admin Links */}
          {isAuthenticated && isAdmin && (
            <>
              <Link
                to="/admin/users"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition ${
                  isActive('/admin/users')
                    ? 'text-indigo bg-indigo-50 font-semibold'
                    : 'text-slate-600 hover:text-ink hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Users
              </Link>
              <Link
                to="/admin/audit-logs"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition ${
                  isActive('/admin/audit-logs')
                    ? 'text-indigo bg-indigo-50 font-semibold'
                    : 'text-slate-600 hover:text-ink hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4" />
                Audit Logs
              </Link>
            </>
          )}
        </nav>

        {/* Right Action / Profile */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="flex flex-col text-right">
                <span className="text-sm font-semibold text-ink leading-tight">{user.name}</span>
                <span className="text-xs text-slate-400 capitalize">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-danger hover:bg-danger-light rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo hover:bg-indigo-50 rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo hover:bg-indigo-hover rounded-lg shadow-soft transition"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
