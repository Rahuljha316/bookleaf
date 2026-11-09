import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { Ticket, PaginatedTicketsData } from '@bookleaf/shared';
import {
  Inbox,
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [ticketData, setTicketData] = useState<PaginatedTicketsData | null>(null);
  const [criticalTickets, setCriticalTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allResult, criticalResult] = await Promise.all([
        api.getAdminTickets({ limit: 10 }),
        api.getAdminTickets({ priority: 'Critical', limit: 100 }),
      ]);
      setTicketData(allResult);
      // Only unresolved critical work belongs in the urgent dashboard section.
      setCriticalTickets(
        criticalResult.tickets
          .filter((ticket) => ticket.status === 'Open' || ticket.status === 'In Progress')
          .slice(0, 5),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const tickets = ticketData?.tickets || [];
  const totalCount = ticketData?.pagination.total || 0;

  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">BookLeaf Support Operations</h1>
              <Badge variant="outline" className="border-indigo-400 bg-indigo-950 text-indigo-300 text-xs">
                Staff Control Center
              </Badge>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Logged in as <span className="font-semibold text-white">{user?.name}</span> ({user?.email})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh Queue
            </Button>
            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Link to="/admin/tickets">
                View Full Queue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm text-slate-500">Loading support operations metrics...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Tickets */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Queries
                </CardTitle>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Inbox className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{totalCount}</div>
                <p className="text-xs text-slate-500 mt-1">Total inquiries in system</p>
              </CardContent>
            </Card>

            {/* Critical Priority Alert */}
            <Card className={criticalTickets.length > 0 ? 'border-red-200 bg-red-50/30' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unresolved Critical (Top 5)
                </CardTitle>
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700">{criticalTickets.length}</div>
                <p className="text-xs text-slate-500 mt-1">Highest-priority open work</p>
              </CardContent>
            </Card>

            {/* Open / Unresolved */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Open Status
                </CardTitle>
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700">{openCount}</div>
                <p className="text-xs text-slate-500 mt-1">Awaiting triage &amp; initial reply</p>
              </CardContent>
            </Card>

            {/* In Progress */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  In Progress
                </CardTitle>
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-700">{inProgressCount}</div>
                <p className="text-xs text-slate-500 mt-1">Under staff investigation</p>
              </CardContent>
            </Card>
          </div>

          {/* Critical Priority Tickets Section */}
          {criticalTickets.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center space-x-2 text-red-900 font-bold mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Urgent: Unresolved Critical Inquiries ({criticalTickets.length})</span>
              </div>
              <div className="space-y-2">
                {criticalTickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white p-3.5 rounded-lg border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-red-700">{t.ticket_number}</span>
                        <Badge variant="critical">Critical</Badge>
                        <span className="text-xs text-slate-500">by {t.author?.name}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{t.subject}</p>
                    </div>
                    <Button variant="destructive" size="sm" asChild>
                      <Link to={`/admin/tickets/${t.id}`}>Manage Inquiry</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Inquiries List */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg">Recent Incoming Tickets</CardTitle>
                <CardDescription>
                  Real-time ticket stream across all registered authors.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/tickets">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  Filter All ({totalCount})
                </Link>
              </Button>
            </CardHeader>

            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p>No support tickets in queue.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {t.ticket_number}
                          </span>
                          <Badge
                            variant={
                              t.status === 'Open'
                                ? 'open'
                                : t.status === 'In Progress'
                                ? 'inProgress'
                                : t.status === 'Resolved'
                                ? 'resolved'
                                : 'closed'
                            }
                          >
                            {t.status}
                          </Badge>
                          <Badge
                            variant={
                              t.priority === 'Critical'
                                ? 'critical'
                                : t.priority === 'High'
                                ? 'high'
                                : t.priority === 'Medium'
                                ? 'medium'
                                : 'low'
                            }
                          >
                            {t.priority}
                          </Badge>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {t.category}
                          </span>
                        </div>

                        <Link
                          to={`/admin/tickets/${t.id}`}
                          className="block text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                        >
                          {t.subject}
                        </Link>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            Author: <strong className="text-slate-700">{t.author?.name}</strong>{' '}
                            {t.author?.author_id && `(${t.author.author_id})`}
                          </span>
                          {t.book && (
                            <span className="flex items-center text-slate-600">
                              <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {t.book.title}
                            </span>
                          )}
                          <span>
                            Assigned:{' '}
                            <strong className="text-slate-700">
                              {t.assignedAdmin ? t.assignedAdmin.name : 'Unassigned'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/tickets/${t.id}`}>Open Ticket</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
