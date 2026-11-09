import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage, type AdminUserSummary } from '@/lib/api';
import type {
  Ticket,
  PaginationMeta,
  TicketStatus,
  TicketPriority,
} from '@bookleaf/shared';
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
} from '@bookleaf/shared';
import {
  Inbox,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  BookOpen,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AdminTicketsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status') || 'All';
  const priorityParam = searchParams.get('priority') || 'All';
  const categoryParam = searchParams.get('category') || 'All';
  const assignedToParam = searchParams.get('assigned_to') || 'All';
  const createdFromParam = searchParams.get('created_from') || '';
  const createdToParam = searchParams.get('created_to') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<AdminUserSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch admin list for the assignment filter
  useEffect(() => {
    async function loadAdmins() {
      try {
        const list = await api.getAdmins();
        setAdmins(list);
      } catch (err) {
        console.error('Failed to load admin list for filter', err);
      }
    }
    loadAdmins();
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminTickets({
        page: pageParam,
        limit: 10,
        status: statusParam === 'All' ? undefined : statusParam,
        priority: priorityParam === 'All' ? undefined : priorityParam,
        category: categoryParam === 'All' ? undefined : categoryParam,
        assigned_to: assignedToParam === 'All' ? undefined : assignedToParam,
        created_from: createdFromParam || undefined,
        created_to: createdToParam || undefined,
      });
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [pageParam, statusParam, priorityParam, categoryParam, assignedToParam, createdFromParam, createdToParam]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'All' || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const getStatusBadgeVariant = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return 'open';
      case 'In Progress':
        return 'inProgress';
      case 'Resolved':
        return 'resolved';
      case 'Closed':
        return 'closed';
      default:
        return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: TicketPriority) => {
    switch (priority) {
      case 'Critical':
        return 'critical';
      case 'High':
        return 'high';
      case 'Medium':
        return 'medium';
      case 'Low':
        return 'low';
      default:
        return 'default';
    }
  };

  const hasActiveFilters =
    statusParam !== 'All' ||
    priorityParam !== 'All' ||
    categoryParam !== 'All' ||
    assignedToParam !== 'All' ||
    createdFromParam !== '' ||
    createdToParam !== '';

  const getTicketAge = (createdAt: string | Date) => {
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
    if (ageDays === 0) return 'Today';
    return `${ageDays}d old`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Ticket Queue</h1>
          <p className="text-sm text-slate-500">
            Monitor, triage, assign and respond to author queries across BookLeaf publishing.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          Total Inquiries: <strong className="text-slate-900">{pagination.total}</strong>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Advanced Filter Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filter Queue</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div className="space-y-1.5">
            <Label htmlFor="statusFilter" className="text-xs">
              Status
            </Label>
            <Select
              id="statusFilter"
              value={statusParam}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="text-xs"
            >
              <option value="All">All Statuses</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1.5">
            <Label htmlFor="priorityFilter" className="text-xs">
              Priority
            </Label>
            <Select
              id="priorityFilter"
              value={priorityParam}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="text-xs"
            >
              <option value="All">All Priorities</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <Label htmlFor="categoryFilter" className="text-xs">
              Category
            </Label>
            <Select
              id="categoryFilter"
              value={categoryParam}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="text-xs truncate"
            >
              <option value="All">All Categories</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          {/* Created Date Range */}
          <div className="space-y-1.5">
            <Label htmlFor="createdFromFilter" className="text-xs">Created From</Label>
            <input
              id="createdFromFilter"
              type="date"
              value={createdFromParam}
              max={createdToParam || undefined}
              onChange={(e) => updateFilter('created_from', e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="createdToFilter" className="text-xs">Created To</Label>
            <input
              id="createdToFilter"
              type="date"
              value={createdToParam}
              min={createdFromParam || undefined}
              onChange={(e) => updateFilter('created_to', e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Assigned Admin Filter */}
          <div className="space-y-1.5">
            <Label htmlFor="assignedFilter" className="text-xs">
              Assigned Admin
            </Label>
            <Select
              id="assignedFilter"
              value={assignedToParam}
              onChange={(e) => updateFilter('assigned_to', e.target.value)}
              className="text-xs"
            >
              <option value="All">All Staff / Assignees</option>
              {admins.map((adm) => (
                <option key={adm.id} value={adm.id}>
                  {adm.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Ticket Table / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Querying tickets database...</p>
        </div>
      ) : tickets.length === 0 ? (
        <Card className="text-center p-12">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No matching tickets</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            No tickets match the selected filter criteria. Try adjusting or clearing your filters.
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleResetFilters}
            >
              Clear All Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">Author</th>
                  <th className="px-5 py-3">Subject &amp; Category</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned To</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className={`transition-colors ${
                      (t.status === 'Open' || t.status === 'In Progress') && t.priority === 'Critical'
                        ? 'bg-rose-50/70 hover:bg-rose-50'
                        : (t.status === 'Open' || t.status === 'In Progress') && t.priority === 'High'
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-900">
                      <div>{t.ticket_number}</div>
                      <div className={`mt-1 text-[10px] font-sans font-medium ${
                        t.status === 'Open' || t.status === 'In Progress' ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                        {getTicketAge(t.created_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{t.author?.name}</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {t.author?.author_id || t.author?.email}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="max-w-xs sm:max-w-md">
                        <Link
                          to={`/admin/tickets/${t.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600 truncate block"
                        >
                          {t.subject}
                        </Link>
                        <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500">
                          <span className="truncate">{t.category}</span>
                          {t.book && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate text-slate-600 flex items-center">
                                <BookOpen className="w-3 h-3 mr-1" />
                                {t.book.title}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant={getPriorityBadgeVariant(t.priority)}>
                        {t.priority}
                      </Badge>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(t.status)}>
                        {t.status}
                      </Badge>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600">
                      {t.assignedAdmin ? (
                        <span className="inline-flex items-center font-medium text-slate-800">
                          <Shield className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                          {t.assignedAdmin.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/tickets/${t.id}`}>Manage</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
