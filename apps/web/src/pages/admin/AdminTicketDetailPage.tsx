import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api, getErrorMessage, type AdminUserSummary } from '@/lib/api';
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '@bookleaf/shared';
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
} from '@bookleaf/shared';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
  User,
  Shield,
  Lock,
  RefreshCw,
  MessageSquare,
  FileText,
  CheckCircle,
  Save,
  Sparkles,
  Trash2,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AdminTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const ticketId = id ? parseInt(id, 10) : 0;
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [admins, setAdmins] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Management Form State
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('Open');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>('Medium');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>('General Inquiry');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string>('');
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Communication Form States
  const [publicReply, setPublicReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // AI Reply Draft States
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [aiDraftError, setAiDraftError] = useState<string | null>(null);
  const [hasAiDraft, setHasAiDraft] = useState(false);
  const [originalAiDraft, setOriginalAiDraft] = useState('');

  const [internalNote, setInternalNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Fetch ticket details
  const fetchTicket = useCallback(
    async (isPolling = false) => {
      if (!ticketId) return;
      if (!isPolling) setLoading(true);
      setError(null);
      try {
        const data = await api.getAdminTicket(ticketId);
        setTicket(data);
        if (!isPolling) {
          setSelectedStatus(data.status);
          setSelectedPriority(data.priority);
          setSelectedCategory(data.category);
          setSelectedAssignedTo(data.assigned_to ? data.assigned_to.toString() : '');
        }
      } catch (err) {
        if (!isPolling) setError(getErrorMessage(err));
      } finally {
        if (!isPolling) setLoading(false);
      }
    },
    [ticketId]
  );

  // Load admins list and ticket details
  useEffect(() => {
    async function loadData() {
      try {
        const adminList = await api.getAdmins();
        setAdmins(adminList);
      } catch (err) {
        console.error('Failed to load admins', err);
      }
      await fetchTicket();
    }
    loadData();

    // Polling every 15s for updates
    const interval = setInterval(() => {
      fetchTicket(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchTicket]);

  // Handle Ticket Management Updates
  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updatingTicket) return;

    setUpdatingTicket(true);
    setActionError(null);
    setUpdateSuccess(false);

    try {
      const payload = {
        status: selectedStatus,
        priority: selectedPriority,
        category: selectedCategory,
        assigned_to: selectedAssignedTo ? parseInt(selectedAssignedTo, 10) : null,
      };

      const updated = await api.updateTicket(ticketId, payload);
      setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Quick Action: Assign to Me
  const handleAssignToMe = async () => {
    if (!user) return;
    setSelectedAssignedTo(user.id.toString());
    setUpdatingTicket(true);
    setActionError(null);
    try {
      const updated = await api.updateTicket(ticketId, { assigned_to: user.id });
      setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Handle Sending Public Response
  const handleSendPublicReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicReply.trim() || sendingReply) return;

    setSendingReply(true);
    setActionError(null);
    try {
      const newMsg = await api.addAdminMessage(ticketId, publicReply.trim());
      setTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...(prev.messages || []), newMsg],
        };
      });
      setPublicReply('');
      setHasAiDraft(false);
      setOriginalAiDraft('');
      setAiDraftError(null);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSendingReply(false);
    }
  };

  // Handle Generating AI Reply Draft
  const handleGenerateAIDraft = async () => {
    if (generatingDraft) return;

    // Protection for manual modifications or existing unsent draft
    if (hasAiDraft && publicReply !== originalAiDraft) {
      const confirmed = window.confirm(
        'You have edited this AI draft. Regenerating will overwrite your modifications. Do you want to continue?'
      );
      if (!confirmed) return;
    } else if (!hasAiDraft && publicReply.trim()) {
      const confirmed = window.confirm(
        'Generating an AI reply will replace the current draft message in your composer. Do you want to continue?'
      );
      if (!confirmed) return;
    }

    setGeneratingDraft(true);
    setAiDraftError(null);

    try {
      const draft = await api.generateAIDraft(ticketId);
      setPublicReply(draft);
      setOriginalAiDraft(draft);
      setHasAiDraft(true);
    } catch (err) {
      setAiDraftError(getErrorMessage(err));
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Handle Discarding AI Draft
  const handleDiscardDraft = () => {
    setPublicReply('');
    setHasAiDraft(false);
    setOriginalAiDraft('');
    setAiDraftError(null);
  };

  // Handle Adding Private Internal Note
  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNote.trim() || addingNote) return;

    setAddingNote(true);
    setActionError(null);
    try {
      const newNote = await api.addInternalNote(ticketId, internalNote.trim());
      setTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          internalNotes: [...(prev.internalNotes || []), newNote],
        };
      });
      setInternalNote('');
      setTimeout(() => {
        notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setAddingNote(false);
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

  const getPriorityBadgeVariant = (priority?: TicketPriority) => {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm text-slate-500">Loading complete ticket data...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Ticket Not Found</h2>
        <p className="text-sm text-slate-600 mb-6">
          {error || 'The requested ticket could not be found.'}
        </p>
        <Button asChild>
          <Link to="/admin/tickets">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Ticket Queue
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
          <Link to="/admin/tickets">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Support Queue
          </Link>
        </Button>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Live polling active (15s)</span>
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

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Information, Conversation & Internal Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header & Author Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {ticket.ticket_number}
                </span>
                <Badge variant={getStatusBadgeVariant(ticket.status)}>
                  {ticket.status}
                </Badge>
                <div className="inline-flex items-center gap-1">
                  <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                    {ticket.priority} Priority
                  </Badge>
                  {ticket.priority_manually_overridden ? (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Manual
                    </span>
                  ) : ticket.ai_classification_status === 'success' ? (
                    <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  ) : null}
                </div>
                <div className="inline-flex items-center gap-1">
                  <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                    {ticket.category}
                  </span>
                  {ticket.category_manually_overridden ? (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Manual
                    </span>
                  ) : ticket.ai_classification_status === 'success' ? (
                    <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  ) : null}
                </div>
              </div>

              <CardTitle className="text-2xl font-bold">{ticket.subject}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                Submitted on {new Date(ticket.created_at).toLocaleString()}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Author & Book Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                {/* Author Info */}
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                    Author Details
                  </span>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{ticket.author?.name}</p>
                      <p className="text-slate-600">{ticket.author?.email}</p>
                      {ticket.author?.author_id && (
                        <p className="font-mono text-slate-500 font-medium">ID: {ticket.author.author_id}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Associated Book Info */}
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px]">
                    Associated Book
                  </span>
                  {ticket.book ? (
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{ticket.book.title}</p>
                        <p className="text-slate-600 font-mono">Book ID: {ticket.book.book_id}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic mt-2">General Inquiry (No associated book)</p>
                  )}
                </div>
              </div>

              {/* Original Author Description */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Author Inquiry Description
                </h4>
                <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {ticket.description}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Public Conversation Stream */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <div>
                  <CardTitle className="text-base font-bold">Public Conversation Stream</CardTitle>
                  <CardDescription className="text-xs">
                    Messages visible to both author and BookLeaf staff.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {(!ticket.messages || ticket.messages.length === 0) ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No public messages have been sent yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {ticket.messages.map((msg) => {
                    const isAdmin = msg.sender?.role === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 mb-1 px-1">
                          {isAdmin ? (
                            <>
                              <Shield className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="font-semibold text-indigo-700">
                                {msg.sender?.name || 'BookLeaf Staff'} (Staff Reply)
                              </span>
                              <span>&bull;</span>
                              <span>{new Date(msg.created_at).toLocaleString()}</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-semibold text-emerald-700">
                                {msg.sender?.name || 'Author'}
                              </span>
                              <span>&bull;</span>
                              <span>{new Date(msg.created_at).toLocaleString()}</span>
                            </>
                          )}
                        </div>

                        <div
                          className={`max-w-xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                            isAdmin
                              ? 'bg-indigo-600 text-white rounded-tr-none'
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

              {/* Public Reply Form with AI Reply Draft Integration */}
              <form onSubmit={handleSendPublicReply} className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label htmlFor="publicReply" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Send Public Response to Author
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAIDraft}
                    disabled={generatingDraft || sendingReply}
                    className="text-xs font-medium text-indigo-700 bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                  >
                    {generatingDraft ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-600" />
                        Generating Draft...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                        Generate AI Reply
                      </>
                    )}
                  </Button>
                </div>

                {/* AI Error Alert */}
                {aiDraftError && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertCircle className="w-4 h-4" />
                    <div className="flex items-center justify-between w-full">
                      <AlertDescription className="text-xs">{aiDraftError}</AlertDescription>
                      <button
                        type="button"
                        onClick={() => setAiDraftError(null)}
                        className="text-xs font-semibold underline ml-3 text-red-700 hover:text-red-900"
                      >
                        Dismiss
                      </button>
                    </div>
                  </Alert>
                )}

                {/* AI Draft Banner */}
                {hasAiDraft && (
                  <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/80 border border-indigo-200 rounded-md text-xs text-indigo-900">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <span className="font-semibold">AI Reply Draft</span>
                      <span className="text-indigo-600/80 hidden sm:inline">
                        &bull; Review and edit before sending. Author will not see until you send.
                      </span>
                    </div>
                    {publicReply !== originalAiDraft && (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200">
                        Edited
                      </span>
                    )}
                  </div>
                )}

                <Textarea
                  id="publicReply"
                  rows={hasAiDraft ? 8 : 4}
                  placeholder={
                    generatingDraft
                      ? "Generating AI reply draft based on ticket context and knowledge base..."
                      : "Draft your response to the author. Explain steps taken, payout details, or resolution status clearly and professionally..."
                  }
                  value={publicReply}
                  onChange={(e) => setPublicReply(e.target.value)}
                  disabled={sendingReply || generatingDraft}
                  className={`bg-white transition-all ${
                    hasAiDraft ? 'border-indigo-300 ring-1 ring-indigo-200/50' : ''
                  }`}
                />

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
                  <p className="text-xs text-slate-400">
                    {hasAiDraft
                      ? 'AI-generated draft is fully editable. Never sent automatically.'
                      : "Will appear immediately on the author's portal."}
                  </p>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    {hasAiDraft && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDiscardDraft}
                          disabled={sendingReply || generatingDraft}
                          className="text-xs text-slate-600 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Discard
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateAIDraft}
                          disabled={generatingDraft || sendingReply}
                          className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        >
                          {generatingDraft ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-indigo-600" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                              Regenerate
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    <Button
                      type="submit"
                      disabled={!publicReply.trim() || sendingReply || generatingDraft}
                      className={hasAiDraft ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                    >
                      {sendingReply ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {hasAiDraft ? 'Send Reply' : 'Send Response'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Private Internal Staff Notes (Admin Isolated) */}
          <Card className="border-amber-200 bg-amber-50/20 shadow-sm">
            <CardHeader className="border-b border-amber-200 bg-amber-50/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <CardTitle className="text-base font-bold text-amber-950">
                    Private Internal Notes
                  </CardTitle>
                </div>
                <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 text-[11px] font-semibold">
                  Confidential &bull; Admins Only
                </Badge>
              </div>
              <CardDescription className="text-amber-800 text-xs">
                Internal team collaboration logs, finance audits, and printing notes. Never visible to authors.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {(!ticket.internalNotes || ticket.internalNotes.length === 0) ? (
                <div className="text-center py-5 text-amber-800/70 text-xs italic">
                  No internal notes recorded yet for this ticket.
                </div>
              ) : (
                <div className="space-y-3">
                  {ticket.internalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs text-amber-900 mb-1.5">
                        <span className="font-bold flex items-center">
                          <Shield className="w-3.5 h-3.5 mr-1 text-amber-700" />
                          {note.admin?.name || 'Administrator'}
                        </span>
                        <span className="text-[11px] text-amber-700">
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {note.note}
                      </p>
                    </div>
                  ))}
                  <div ref={notesEndRef} />
                </div>
              )}

              {/* Add Internal Note Form */}
              <form onSubmit={handleAddInternalNote} className="pt-3 border-t border-amber-200 space-y-2.5">
                <Label htmlFor="internalNote" className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                  Add Private Staff Note
                </Label>
                <Textarea
                  id="internalNote"
                  rows={2}
                  placeholder="Record internal findings (e.g. 'Verified bank transaction ID with finance', 'Reprint dispatched via Delhi hub')..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  disabled={addingNote}
                  className="bg-white border-amber-200 focus-visible:ring-amber-500"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-900 hover:bg-amber-100"
                    disabled={!internalNote.trim() || addingNote}
                  >
                    {addingNote ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Saving Note...
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                        Save Internal Note
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Ticket Management Sidebar */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm sticky top-20">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold flex items-center">
                <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                Ticket Management
              </CardTitle>
              <CardDescription className="text-xs">
                Update workflow status, categorization, priority, and staff assignments.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              {updateSuccess && (
                <Alert variant="success" className="mb-4">
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>Ticket updated successfully.</AlertDescription>
                </Alert>
              )}

              {/* AI Classification Suggestions (Separate from admin-controlled inputs) */}
              {(ticket.ai_suggested_category ||
                ticket.ai_suggested_priority ||
                ticket.ai_classification_status) && (
                <div className="mb-5 p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-950 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-purple-700" />
                      AI Suggestions
                    </span>
                    {ticket.ai_classification_status && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-medium ${
                          ticket.ai_classification_status === 'success'
                            ? 'border-purple-300 text-purple-800 bg-purple-100/70'
                            : ticket.ai_classification_status === 'failed'
                            ? 'border-red-300 text-red-700 bg-red-50'
                            : 'border-slate-300 text-slate-600 bg-slate-50'
                        }`}
                      >
                        {ticket.ai_classification_status === 'success'
                          ? 'Analyzed'
                          : ticket.ai_classification_status}
                      </Badge>
                    )}
                  </div>

                  {ticket.ai_classification_status === 'success' && (
                    <div className="space-y-1.5 text-slate-700 pt-1 border-t border-purple-200/60">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Category:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {ticket.ai_suggested_category || 'None'}
                          </span>
                          {ticket.category_manually_overridden ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              Overridden
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Priority:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {ticket.ai_suggested_priority || 'None'}
                          </span>
                          {ticket.priority_manually_overridden ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                              Overridden
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-purple-700/80 pt-0.5 italic">
                        {ticket.category_manually_overridden || ticket.priority_manually_overridden
                          ? 'Admin manual overrides take precedence over AI suggestions.'
                          : 'Initial values set by AI. Admin maintains final decision.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleUpdateTicket} className="space-y-4">
                {/* Status Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="statusSelect" className="text-xs">
                    Ticket Status
                  </Label>
                  <Select
                    id="statusSelect"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                  >
                    {TICKET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Priority Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="prioritySelect" className="text-xs">
                    Priority Level
                  </Label>
                  <Select
                    id="prioritySelect"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as TicketPriority)}
                  >
                    {TICKET_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Category Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="categorySelect" className="text-xs">
                    Category Classification
                  </Label>
                  <Select
                    id="categorySelect"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as TicketCategory)}
                  >
                    {TICKET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Assigned Staff Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="assignedSelect" className="text-xs">
                      Assigned Administrator
                    </Label>
                    <button
                      type="button"
                      onClick={handleAssignToMe}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Assign to Me
                    </button>
                  </div>
                  <Select
                    id="assignedSelect"
                    value={selectedAssignedTo}
                    onChange={(e) => setSelectedAssignedTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {admins.map((adm) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.name} ({adm.email})
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Submit Update Button */}
                <Button
                  type="submit"
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                  disabled={updatingTicket}
                >
                  {updatingTicket ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>

              {/* Assignment Quick Card */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Current Assignee:</span>
                  <span className="font-semibold text-slate-800">
                    {ticket.assignedAdmin ? ticket.assignedAdmin.name : 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span>{new Date(ticket.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
