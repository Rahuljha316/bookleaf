import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '@/lib/api';
import type { Ticket, PaginationMeta, TicketStatus } from '@bookleaf/shared';
import {
  Ticket as TicketIcon,
  PlusCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AuthorTicketsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status') || 'All';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuthorTickets({
        page: pageParam,
        limit: 10,
        status: statusParam === 'All' ? undefined : statusParam,
      });
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [pageParam, statusParam]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams);
    if (newStatus === 'All') {
      params.delete('status');
    } else {
      params.set('status', newStatus);
    }
    params.set('page', '1');
    setSearchParams(params);
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

  const getPriorityBadgeVariant = (priority: string) => {
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Support Tickets</h1>
          <p className="text-sm text-slate-500">
            View history and track ongoing inquiries raised with BookLeaf support.
          </p>
        </div>
        <Button asChild>
          <Link to="/author/tickets/new">
            <PlusCircle className="w-4 h-4 mr-2" />
            Raise New Query
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Status:
          </span>
          {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusParam === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-900">{tickets.length}</span> of{' '}
          <span className="font-semibold text-slate-900">{pagination.total}</span> tickets
        </div>
      </div>

      {/* Ticket Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm text-slate-500">Loading your tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <Card className="text-center p-12">
          <TicketIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No tickets found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {statusParam !== 'All'
              ? `There are no tickets with status "${statusParam}".`
              : 'You have not raised any support tickets yet.'}
          </p>
          {statusParam !== 'All' ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => handleStatusChange('All')}
            >
              Clear Filter
            </Button>
          ) : (
            <Button asChild size="sm" className="mt-4">
              <Link to="/author/tickets/new">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Submit Your First Ticket
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="hover:border-emerald-300 hover:shadow-md transition-all duration-150"
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {ticket.ticket_number}
                      </span>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                        {ticket.priority} Priority
                      </Badge>
                      <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                        {ticket.category}
                      </span>
                    </div>

                    <Link
                      to={`/author/tickets/${ticket.id}`}
                      className="block text-base font-bold text-slate-900 hover:text-emerald-700 transition-colors truncate"
                    >
                      {ticket.subject}
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {ticket.book ? (
                        <span className="flex items-center text-slate-700">
                          <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {ticket.book.title} ({ticket.book.book_id})
                        </span>
                      ) : (
                        <span className="text-slate-400">General Inquiry (No Book)</span>
                      )}
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Created {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 sm:self-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/author/tickets/${ticket.id}`}>View Thread</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
