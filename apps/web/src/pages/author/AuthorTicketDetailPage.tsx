import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api, getErrorMessage } from '@/lib/api';
import type { Ticket, TicketStatus } from '@bookleaf/shared';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
  Shield,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AuthorTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const ticketId = id ? parseInt(id, 10) : 0;
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(
    async (isPolling = false) => {
      if (!ticketId) return;
      if (!isPolling) setLoading(true);
      setError(null);
      try {
        const data = await api.getAuthorTicket(ticketId);
        setTicket(data);
      } catch (err) {
        if (!isPolling) setError(getErrorMessage(err));
      } finally {
        if (!isPolling) setLoading(false);
      }
    },
    [ticketId]
  );

  useEffect(() => {
    fetchTicket();

    // Polling every 15 seconds for real-time conversation updates
    const interval = setInterval(() => {
      fetchTicket(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchTicket]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || sending) return;

    setSending(true);
    setActionError(null);
    try {
      const newMsg = await api.addAuthorMessage(ticketId, replyMessage.trim());
      setTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...(prev.messages || []), newMsg],
        };
      });
      setReplyMessage('');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const getStatusBadgeVariant = (status?: TicketStatus) => {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm text-slate-500">Loading ticket thread...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Ticket Not Found</h2>
        <p className="text-sm text-slate-600 mb-6">
          {error || 'The requested ticket does not exist or you do not have permission to view it.'}
        </p>
        <Button asChild>
          <Link to="/author/tickets">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to My Tickets
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
          <Link to="/author/tickets">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Tickets
          </Link>
        </Button>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTicket(false)}
            className="text-xs text-slate-600"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Ticket Summary Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {ticket.ticket_number}
                </span>
                <Badge variant={getStatusBadgeVariant(ticket.status)}>
                  {ticket.status}
                </Badge>
                <Badge variant="outline" className="border-slate-300">
                  {ticket.priority} Priority
                </Badge>
                <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {ticket.category}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{ticket.subject}</h1>
              <p className="text-xs text-slate-500 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Submitted on {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Associated Book Info & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">Associated Book:</span>
              {ticket.book ? (
                <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-semibold text-slate-800">{ticket.book.title}</span>
                    <span className="text-slate-500 ml-1.5 font-mono">({ticket.book.book_id})</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  General Inquiry (Not linked to a book)
                </p>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">Support Representative:</span>
              <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-slate-800">
                  {ticket.assignedAdmin ? ticket.assignedAdmin.name : 'BookLeaf Operations Team'}
                </span>
              </div>
            </div>
          </div>

          {/* Initial Query Description */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Original Query
            </h4>
            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200">
              {ticket.description}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Thread */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-base font-bold">Conversation History</CardTitle>
            </div>
            <span className="text-xs text-slate-400">
              Live updates active (polling every 15s)
            </span>
          </div>
          <CardDescription>
            Messages exchanged with BookLeaf support regarding this inquiry.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {(!ticket.messages || ticket.messages.length === 0) ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <p>No messages yet in this conversation.</p>
              <p className="text-xs text-slate-400 mt-1">
                A BookLeaf support representative will respond shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ticket.messages.map((msg) => {
                const isAuthorSender = msg.sender_id === user?.id || msg.sender?.role === 'author';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isAuthorSender ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 mb-1 px-1">
                      {isAuthorSender ? (
                        <>
                          <span className="font-semibold text-emerald-700">You (Author)</span>
                          <span>&bull;</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-semibold text-indigo-700">
                            {msg.sender?.name || 'BookLeaf Support'} (Staff)
                          </span>
                          <span>&bull;</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                        isAuthorSender
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Action Error Banner */}
          {actionError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          {/* Send Message Form */}
          {ticket.status === 'Closed' ? (
            <div className="bg-slate-100 p-4 rounded-lg text-center text-sm text-slate-600">
              This ticket has been marked as <strong>Closed</strong>. You cannot send additional messages to closed tickets.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-100 space-y-3">
              <Textarea
                rows={3}
                placeholder="Type your reply here..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                disabled={sending}
                className="bg-white"
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!replyMessage.trim() || sending}>
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
