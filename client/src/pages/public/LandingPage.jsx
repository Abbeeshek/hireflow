import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Search,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo to-ink text-white p-8 md:p-16 shadow-hover">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-lavender text-xs font-semibold tracking-wide border border-white/15">
            <Zap className="w-3.5 h-3.5 text-amber" />
            Phase 1 ATS Foundation • Zero Cloud Lag
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight">
            Recruitment speed, structured from application to hire.
          </h1>
          <p className="text-base sm:text-lg text-lavender/90 font-light max-w-2xl leading-relaxed">
            HireFlow equips recruitment teams with real-time kanban pipelines, customizable scoring weights, and streamlined applicant tracking on 100% local infrastructure.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber text-ink font-semibold shadow-soft hover:bg-amber/90 transition transform hover:-translate-y-0.5"
            >
              <Search className="w-4 h-4" />
              Browse Open Positions
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-md border border-white/20 transition"
            >
              Sign In to Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Decorative background gradients */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-indigo-light/20 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-64 h-64 rounded-full bg-amber/15 blur-2xl pointer-events-none" />
      </section>

      {/* Highlights / Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Pipeline Stages', value: '10 Stages', desc: 'From applied to hired' },
          { label: 'Scoring Precision', value: '100% Exact', desc: 'Custom weights per job' },
          { label: 'Resume Validation', value: 'Triple Check', desc: 'MIME, ext & magic bytes' },
          { label: 'System Auditing', value: 'Tamper-Proof', desc: 'Every action logged' }
        ].map((stat, idx) => (
          <div
            key={idx}
            className="p-6 bg-white rounded-card border border-slate-100 shadow-soft hover:shadow-hover transition"
          >
            <div className="font-heading text-2xl sm:text-3xl font-bold text-indigo mb-1">
              {stat.value}
            </div>
            <div className="text-sm font-semibold text-ink mb-0.5">{stat.label}</div>
            <div className="text-xs text-slate-400">{stat.desc}</div>
          </div>
        ))}
      </section>

      {/* Feature Pillars */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="font-heading text-3xl font-bold text-ink">
            A Complete Recruitment Engine
          </h2>
          <p className="text-slate-500 text-sm">
            Everything your talent team needs to collaborate, review candidates, and manage pipeline velocity.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-8 bg-white rounded-card border border-slate-100 shadow-soft space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-ink">Recruiter Dashboard</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Full funnel visibility powered by dynamic stage graphs, top job applicant volumes, and quick-action candidate pipelines.
            </p>
            <ul className="space-y-2 text-xs text-slate-500 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Recharts funnel analytics
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Kanban board & Table views
              </li>
            </ul>
          </div>

          <div className="p-8 bg-white rounded-card border border-slate-100 shadow-soft space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-lavender-light flex items-center justify-center text-indigo">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-ink">Candidate Transparency</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Transparent multi-stage timeline tracking, verified resume storage, and custom profile showcases with portfolio and github links.
            </p>
            <ul className="space-y-2 text-xs text-slate-500 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Live application history timeline
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> 5 MB Magic byte verified uploads
              </li>
            </ul>
          </div>

          <div className="p-8 bg-white rounded-card border border-slate-100 shadow-soft space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-light flex items-center justify-center text-amber-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-ink">RBAC & Governance</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Company-level tenant boundaries, strict backend authorization checks, admin user management, and automated action auditing.
            </p>
            <ul className="space-y-2 text-xs text-slate-500 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> HttpOnly sameSite=lax JWT cookies
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Comprehensive audit logs with IP
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-lavender-light rounded-3xl p-8 sm:p-12 border border-lavender/50 text-center space-y-4">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
          Ready to experience HireFlow?
        </h2>
        <p className="text-slate-600 text-sm max-w-xl mx-auto">
          Sign in using our seed accounts or create a new candidate or recruiter account in seconds.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to="/register"
            className="px-6 py-3 rounded-xl bg-indigo text-white font-semibold shadow-soft hover:bg-indigo-hover transition"
          >
            Create Free Account
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 rounded-xl bg-white text-slate-700 font-medium border border-slate-200 hover:bg-slate-50 transition"
          >
            Sign In with Demo Accounts
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
