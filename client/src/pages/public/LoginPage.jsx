import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Briefcase, Lock, Mail, ArrowRight, UserCheck, Shield } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      const user = await login(data);
      if (redirect) {
        navigate(redirect);
      } else if (user.role === 'recruiter') {
        navigate('/recruiter/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin/users');
      } else {
        navigate('/candidate/dashboard');
      }
    } catch (err) {
      // toast shown in AuthContext
    }
  };

  const handleAutofill = (email, password) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo text-white items-center justify-center shadow-soft mb-2">
          <Briefcase className="w-6 h-6" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-ink">Welcome Back</h1>
        <p className="text-sm text-slate-500">Sign in to your HireFlow portal account</p>
      </div>

      {/* Form Card */}
      <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                {...register('email')}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo/10 ${
                  errors.email ? 'border-danger focus:border-danger' : 'border-slate-200 focus:border-indigo'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-danger font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo/10 ${
                  errors.password ? 'border-danger focus:border-danger' : 'border-slate-200 focus:border-indigo'
                }`}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-danger font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo hover:bg-indigo-hover text-white font-semibold text-sm shadow-soft transition disabled:opacity-50"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Fill */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
            One-Click Demo Credentials
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleAutofill('recruiter@hireflow.test', 'Recruiter@123')}
              className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo rounded-lg text-xs font-medium border border-indigo-100 transition"
            >
              Recruiter
            </button>
            <button
              type="button"
              onClick={() => handleAutofill('candidate1@hireflow.test', 'Candidate@123')}
              className="px-2 py-1.5 bg-lavender-light hover:bg-lavender text-ink rounded-lg text-xs font-medium border border-lavender/60 transition"
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => handleAutofill('admin@hireflow.test', 'Admin@123')}
              className="px-2 py-1.5 bg-amber-light hover:bg-amber text-amber-900 rounded-lg text-xs font-medium border border-amber-200 transition"
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Footer Register Link */}
      <div className="text-center text-xs text-slate-500">
        Don't have an account yet?{' '}
        <Link to="/register" className="font-semibold text-indigo hover:underline">
          Create Account
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
