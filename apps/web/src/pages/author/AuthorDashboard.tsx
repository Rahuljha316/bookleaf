import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { Book, Ticket } from '@bookleaf/shared';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ExternalLink,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AuthorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [booksData, ticketsData] = await Promise.all([
        api.getAuthorBooks(),
        api.getAuthorTickets({ limit: 4 }),
      ]);
      setBooks(booksData);
      setRecentTickets(ticketsData.tickets);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregated Royalty and Sales metrics
  const totalSold = books.reduce((acc, b) => acc + (Number(b.total_copies_sold) || 0), 0);
  const totalEarned = books.reduce((acc, b) => acc + (Number(b.total_royalty_earned) || 0), 0);
  const totalPaid = books.reduce((acc, b) => acc + (Number(b.royalty_paid) || 0), 0);
  const totalPending = books.reduce((acc, b) => acc + (Number(b.royalty_pending) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading your author portfolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Author Profile Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
              {user?.author_id && (
                <Badge variant="outline" className="border-slate-300 font-mono text-xs">
                  {user.author_id}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Welcome back to your BookLeaf Author Portal
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3 text-xs text-slate-600">
              <span className="flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                {user?.email}
              </span>
              {user?.phone && (
                <span className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  {user.phone}
                </span>
              )}
              {user?.city && (
                <span className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  {user.city}
                </span>
              )}
              {user?.joined_date && (
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  Joined {new Date(user.joined_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} title="Refresh data">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            <Button asChild size="sm">
              <Link to="/author/tickets/new">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Raise Support Ticket
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

      {/* Financial & Royalty KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Copies Sold */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Copies Sold
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {totalSold.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Across {books.length} published titles</p>
          </CardContent>
        </Card>

        {/* Total Royalty Earned */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Royalty Earned
            </CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalEarned)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Lifetime accrued royalties</p>
          </CardContent>
        </Card>

        {/* Royalty Paid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Royalty Disbursed
            </CardTitle>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Transferred to registered bank</p>
          </CardContent>
        </Card>

        {/* Royalty Pending */}
        <Card className={totalPending > 0 ? 'border-amber-200 bg-amber-50/40' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Royalty Pending
            </CardTitle>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPending > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Pending next quarterly payout cycle</p>
          </CardContent>
        </Card>
      </div>

      {/* Books and Publication Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Published Books</h2>
            <p className="text-sm text-slate-500">
              Production status, pricing, channel availability, and individual royalty performance.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {books.length} {books.length === 1 ? 'Title' : 'Titles'}
          </span>
        </div>

        {books.length === 0 ? (
          <Card className="text-center p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No books found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              There are no books currently linked to your author profile.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {books.map((book) => (
              <Card key={book.id} className="hover:border-slate-300 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Book Basic Info */}
                    <div className="space-y-2 lg:max-w-md">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {book.book_id}
                        </span>
                        <Badge
                          variant={
                            book.status.toLowerCase().includes('live') || book.status.toLowerCase().includes('published')
                              ? 'resolved'
                              : 'inProgress'
                          }
                        >
                          {book.status}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">{book.title}</h3>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400">Genre:</span> {book.genre}
                        </div>
                        <div>
                          <span className="text-slate-400">ISBN:</span>{' '}
                          <span className="font-mono">{book.isbn}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Publication:</span>{' '}
                          {book.publication_date ? new Date(book.publication_date).toLocaleDateString() : 'In Production'}
                        </div>
                        <div>
                          <span className="text-slate-400">Print Partner:</span>{' '}
                          {book.print_partner || 'BookLeaf Press'}
                        </div>
                      </div>

                      {/* Distribution Channels */}
                      {book.available_on && book.available_on.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Available On
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {book.available_on.map((channel) => (
                              <span
                                key={channel}
                                className="inline-flex items-center text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
                              >
                                {channel}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Financial Performance Table */}
                    <div className="flex-1 lg:max-w-lg bg-slate-50/70 rounded-lg p-4 border border-slate-100">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        Royalty &amp; Sales Summary
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <p className="text-[11px] text-slate-400">MRP / Royalty</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">
                            {book.mrp ? `₹${book.mrp}` : '—'} / {book.author_royalty_per_copy ? `₹${book.author_royalty_per_copy}` : '—'}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <p className="text-[11px] text-slate-400">Copies Sold</p>
                          <p className="text-sm font-bold text-slate-800 mt-0.5">
                            {book.total_copies_sold}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <p className="text-[11px] text-slate-400">Earned</p>
                          <p className="text-sm font-bold text-emerald-700 mt-0.5">
                            {formatCurrency(Number(book.total_royalty_earned))}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <p className="text-[11px] text-slate-400">Paid</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">
                            {formatCurrency(Number(book.royalty_paid) || 0)}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-200">
                          <p className="text-[11px] text-slate-400">Pending</p>
                          <p className="text-sm font-bold text-amber-700 mt-0.5">
                            {formatCurrency(Number(book.royalty_pending))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Last payout:{' '}
                          {book.last_royalty_payout_date
                            ? new Date(book.last_royalty_payout_date).toLocaleDateString()
                            : 'Pending first cycle'}
                        </span>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/author/tickets/new?bookId=${book.id}`}>
                            Raise Query for this Book
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Support Tickets Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Support Inquiries</h2>
            <p className="text-sm text-slate-500">Track conversation progress with BookLeaf operations.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/author/tickets" className="flex items-center">
              View All Tickets
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {recentTickets.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
            <p className="text-sm text-slate-500">You haven't submitted any tickets yet.</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/author/tickets/new">Submit Your First Query</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTickets.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-slate-700">
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
                    <span className="text-xs text-slate-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 truncate mt-1">{t.subject}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/author/tickets/${t.id}`}>View Thread</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
