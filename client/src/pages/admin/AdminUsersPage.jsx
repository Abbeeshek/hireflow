import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUserStatus } from '../../api/adminApi.js';
import { formatDate } from '../../utils/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import toast from 'react-hot-toast';
import { Users, Search, ShieldCheck, UserX, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';

export const AdminUsersPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 10,
    ...(search && { search }),
    ...(role && { role }),
    ...(status && { status })
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminUsers', queryParams],
    queryFn: () => getUsers(queryParams)
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => updateUserStatus(id, isActive),
    onSuccess: (_, variables) => {
      toast.success(`User marked as ${variables.isActive ? 'Active' : 'Deactivated'}!`);
      queryClient.invalidateQueries(['adminUsers']);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update user status');
    }
  });

  const users = data?.data?.items || [];
  const pagination = data?.data?.pagination || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-ink">User Account Management</h1>
        <p className="text-sm text-slate-500">
          Review system users, roles, and toggle account activation statuses.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo transition"
            />
          </div>

          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo"
          >
            <option value="">All Roles</option>
            <option value="candidate">Candidate</option>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total Users: {pagination.total}
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <LoadingSpinner text="Loading user accounts..." />
      ) : isError ? (
        <EmptyState
          title="Could not load users"
          description="Error occurred while querying the database."
          action={
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg"
            >
              Retry
            </button>
          }
        />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try clearing your search or status filters." />
      ) : (
        <div className="bg-white rounded-card border border-slate-100 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-4 text-right">Toggle Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {u.company?.name || '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-success-light text-success border border-emerald-300'
                            : 'bg-danger-light text-danger border border-rose-300'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">{formatDate(u.createdAt)}</td>

                    <td className="py-3.5 px-4 text-right">
                      {u.role === 'admin' ? (
                        <span className="text-[11px] text-slate-400 italic">Protected</span>
                      ) : (
                        <button
                          onClick={() =>
                            toggleMutation.mutate({ id: u._id, isActive: !u.isActive })
                          }
                          disabled={toggleMutation.isPending}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition ${
                            u.isActive
                              ? 'bg-danger-light text-danger hover:bg-rose-200'
                              : 'bg-success-light text-success hover:bg-emerald-200'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Activate
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-600 px-3">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
