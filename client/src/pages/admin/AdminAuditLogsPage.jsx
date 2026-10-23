import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../api/adminApi.js';
import { formatDate } from '../../utils/formatters.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Shield, Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

export const AdminAuditLogsPage = () => {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 15,
    ...(action && { action }),
    ...(entityType && { entityType })
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminAuditLogs', queryParams],
    queryFn: () => getAuditLogs(queryParams)
  });

  const logs = data?.data?.items || [];
  const pagination = data?.data?.pagination || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-ink">System Audit Trail</h1>
        <p className="text-sm text-slate-500">
          Immutable audit record of all security, application, authentication, and pipeline events.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Filter by Action (e.g. LOGIN, STAGE_CHANGE)..."
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo transition"
          />

          <input
            type="text"
            placeholder="Filter by Entity Type (e.g. User, Application)..."
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo transition"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total Logged Events: {pagination.total}
        </div>
      </div>

      {/* Audit Logs Table */}
      {isLoading ? (
        <LoadingSpinner text="Querying audit records..." />
      ) : isError ? (
        <EmptyState
          title="Could not load audit logs"
          description="Failed to retrieve audit log records from the database."
          action={
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-medium bg-indigo text-white rounded-lg"
            >
              Retry
            </button>
          }
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No audit events found"
          description="Try broadening your action or entity filters."
        />
      ) : (
        <div className="bg-white rounded-card border border-slate-100 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Entity Type</th>
                  <th className="py-3.5 px-4">Metadata</th>
                  <th className="py-3.5 px-4">Client IP</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition font-sans">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-indigo px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {log.actor ? (
                        <div>
                          <div className="font-semibold text-ink">{log.actor.name}</div>
                          <div className="text-[10px] text-slate-400">{log.actor.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">System / Anonymous</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {log.entityType}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-[11px] text-slate-500 font-mono">
                      {log.meta ? JSON.stringify(log.meta) : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[10px]">
                      {log.ip || '127.0.0.1'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString()}
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

export default AdminAuditLogsPage;
