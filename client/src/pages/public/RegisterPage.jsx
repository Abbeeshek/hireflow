import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Briefcase, Lock, Mail, User, Building, ArrowRight } from 'lucide-react';

const registerSchema = z
  .object({
    role: z.enum(['candidate', 'recruiter']),
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    companyName: z.string().trim().optional()
  })
  .refine(
    (data) => {
      if (data.role === 'recruiter') {
        return !!data.companyName && data.companyName.trim().length >= 2;
      }
      return true;
    },
    {
      message: 'Company name is required for recruiter registration',
      path: ['companyName']
    }
  );

export const RegisterPage = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('candidate');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'candidate',
      name: '',
      email: '',
      password: '',
      companyName: ''
    }
  });

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setValue('role', role, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    try {
      const user = await authRegister(data);
      if (user.role === 'recruiter') {
        navigate('/recruiter/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    } catch (err) {
      // Toast displayed in context
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo text-white items-center justify-center shadow-soft mb-2">
          <Briefcase className="w-6 h-6" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-ink">Create Your Account</h1>
        <p className="text-sm text-slate-500">Join HireFlow to recruit talent or discover jobs</p>
      </div>

      {/* Form Card */}
      <div className="bg-white p-8 rounded-card border border-slate-100 shadow-soft space-y-6">
        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleRoleChange('candidate')}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              selectedRole === 'candidate'
                ? 'bg-white text-indigo shadow-sm'
                : 'text-slate-500 hover:text-ink'
            }`}
          >
            Candidate
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('recruiter')}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              selectedRole === 'recruiter'
                ? 'bg-white text-indigo shadow-sm'
                : 'text-slate-500 hover:text-ink'
            }`}
          >
            Recruiter / Employer
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                {...register('name')}
                placeholder="Jane Doe"
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo/10 ${
                  errors.name ? 'border-danger focus:border-danger' : 'border-slate-200 focus:border-indigo'
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-xs text-danger font-medium">{errors.name.message}</p>
            )}
          </div>

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
                placeholder="jane@example.com"
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo/10 ${
                  errors.email ? 'border-danger focus:border-danger' : 'border-slate-200 focus:border-indigo'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-danger font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* If Recruiter: Company Name */}
          {selectedRole === 'recruiter' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Company Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  {...register('companyName')}
                  placeholder="Acme Technologies"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border rounded-xl outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo/10 ${
                    errors.companyName ? 'border-danger focus:border-danger' : 'border-slate-200 focus:border-indigo'
                  }`}
                />
              </div>
              {errors.companyName && (
                <p className="text-xs text-danger font-medium">{errors.companyName.message}</p>
              )}
            </div>
          )}

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
                placeholder="At least 6 characters"
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
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo hover:bg-indigo-hover text-white font-semibold text-sm shadow-soft transition disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer Login Link */}
      <div className="text-center text-xs text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-indigo hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;
