import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, getErrorMessage } from '@/lib/api';
import type { Book } from '@bookleaf/shared';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle,
  Paperclip,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const createTicketSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(255, 'Subject cannot exceed 255 characters'),
  description: z
    .string()
    .min(10, 'Please provide more details (at least 10 characters)'),
  book_id: z.string().optional(),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedBookId = searchParams.get('bookId');

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      book_id: preselectedBookId || '',
    },
  });

  useEffect(() => {
    async function loadBooks() {
      try {
        const data = await api.getAuthorBooks();
        setBooks(data);
        if (preselectedBookId) {
          setValue('book_id', preselectedBookId);
        }
      } catch (err) {
        console.error('Failed to load books for dropdown', err);
      } finally {
        setLoadingBooks(false);
      }
    }
    loadBooks();
  }, [preselectedBookId, setValue]);

  const onSubmit = async (data: CreateTicketFormData) => {
    setServerError(null);
    try {
      const payload = {
        subject: data.subject.trim(),
        description: data.description.trim(),
        book_id: data.book_id && data.book_id !== '' ? parseInt(data.book_id, 10) : undefined,
      };

      const ticket = await api.createTicket(payload);
      navigate(`/author/tickets/${ticket.id}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
          <Link to="/author/tickets">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to My Tickets
          </Link>
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xl">Raise Support Query</CardTitle>
              <CardDescription>
                Submit an inquiry directly to the BookLeaf operations and editorial team.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Associated Book Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="book_id">
                Related Book <span className="text-xs text-slate-500 font-normal">(Optional)</span>
              </Label>
              <Select
                id="book_id"
                disabled={loadingBooks}
                {...register('book_id')}
              >
                <option value="">General / Account Level Query (No Book)</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.book_id} • {b.isbn})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-slate-500">
                Selecting a book allows our team to quickly pull up your production &amp; royalty records.
              </p>
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                placeholder="e.g. Discrepancy in October royalty statement, ISBN correction needed"
                {...register('subject')}
              />
              {errors.subject && (
                <p className="text-xs text-red-600 font-medium">{errors.subject.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Please describe your query in detail. Include any order numbers, platform details (Amazon, Flipkart), dates, or specific questions..."
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-red-600 font-medium">{errors.description.message}</p>
              )}
            </div>

            {/* UI File Attachment Mockup (Scope requirement per assignment) */}
            <div className="p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-center">
              <Paperclip className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">Attach Supporting Files (UI Mockup)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                PNG, JPG, or PDF up to 10MB (UI placeholder per assignment specifications).
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-2.5 text-xs h-7" disabled>
                Select Files...
              </Button>
            </div>

            {/* Helpful Note */}
            <div className="flex items-start space-x-2 text-xs text-slate-500 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              <HelpCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                Our operations team typically responds within 24–48 business hours. You can track all updates and replies in your ticket thread.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button type="button" variant="outline" asChild disabled={isSubmitting}>
                <Link to="/author/tickets">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Ticket...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

