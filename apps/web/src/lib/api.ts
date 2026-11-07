import axios from 'axios';
import type {
  ApiResponse,
  AuthUser,
  Book,
  CreateTicketPayload,
  LoginRequest,
  PaginatedTicketsData,
  Ticket,
  TicketMessage,
  TicketInternalNote,
  UpdateTicketPayload,
} from '@bookleaf/shared';

// Base Axios instance configured with HTTP-only cookie support
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Extracts a readable error message from an Axios error or standard Error.
 */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiResponse | undefined;
    if (data?.message) return data.message;
    if (typeof err.response?.data === 'string') return err.response.data;
    if (err.message) return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

export const api = {
  // ─── Authentication ──────────────────────────────────────────────────────────
  async login(payload: LoginRequest): Promise<AuthUser> {
    const res = await apiClient.post<ApiResponse<{ user: AuthUser }>>('/auth/login', payload);
    if (!res.data.data?.user) {
      throw new Error(res.data.message || 'Login failed.');
    }
    return res.data.data.user;
  },

  async logout(): Promise<void> {
    await apiClient.post<ApiResponse>('/auth/logout');
  },

  async getMe(): Promise<AuthUser> {
    const res = await apiClient.get<ApiResponse<{ user: AuthUser }>>('/auth/me');
    if (!res.data.data?.user) {
      throw new Error(res.data.message || 'Unable to retrieve user session.');
    }
    return res.data.data.user;
  },

  // ─── Author Portal ─────────────────────────────────────────────────────────
  async getAuthorBooks(): Promise<Book[]> {
    const res = await apiClient.get<ApiResponse<{ books: Book[] }>>('/books');
    return res.data.data?.books ?? [];
  },

  async createTicket(payload: CreateTicketPayload): Promise<Ticket> {
    const res = await apiClient.post<ApiResponse<{ ticket: Ticket }>>('/tickets', payload);
    if (!res.data.data?.ticket) {
      throw new Error(res.data.message || 'Failed to create ticket.');
    }
    return res.data.data.ticket;
  },

  async getAuthorTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedTicketsData> {
    const cleanParams: Record<string, unknown> = {};
    if (params?.page) cleanParams['page'] = params.page;
    if (params?.limit) cleanParams['limit'] = params.limit;
    if (params?.status && params.status !== 'All') cleanParams['status'] = params.status;

    const res = await apiClient.get<ApiResponse<PaginatedTicketsData>>('/tickets', {
      params: cleanParams,
    });
    return (
      res.data.data ?? {
        tickets: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    );
  },

  async getAuthorTicket(id: number): Promise<Ticket> {
    const res = await apiClient.get<ApiResponse<{ ticket: Ticket }>>(`/tickets/${id}`);
    if (!res.data.data?.ticket) {
      throw new Error(res.data.message || 'Ticket not found.');
    }
    return res.data.data.ticket;
  },

  async addAuthorMessage(id: number, message: string): Promise<TicketMessage> {
    const res = await apiClient.post<ApiResponse<{ message: TicketMessage }>>(
      `/tickets/${id}/messages`,
      { message }
    );
    if (!res.data.data?.message) {
      throw new Error(res.data.message || 'Failed to post message.');
    }
    return res.data.data.message;
  },

  // ─── Admin Portal ──────────────────────────────────────────────────────────
  async getAdminTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    assigned_to?: number | string;
  }): Promise<PaginatedTicketsData> {
    const cleanParams: Record<string, unknown> = {};
    if (params?.page) cleanParams['page'] = params.page;
    if (params?.limit) cleanParams['limit'] = params.limit;
    if (params?.status && params.status !== 'All') cleanParams['status'] = params.status;
    if (params?.priority && params.priority !== 'All') cleanParams['priority'] = params.priority;
    if (params?.category && params.category !== 'All') cleanParams['category'] = params.category;
    if (params?.assigned_to !== undefined && params.assigned_to !== '' && params.assigned_to !== 'All') {
      cleanParams['assigned_to'] = params.assigned_to;
    }

    const res = await apiClient.get<ApiResponse<PaginatedTicketsData>>('/admin/tickets', {
      params: cleanParams,
    });
    return (
      res.data.data ?? {
        tickets: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    );
  },

  async getAdminTicket(id: number): Promise<Ticket> {
    const res = await apiClient.get<ApiResponse<{ ticket: Ticket }>>(`/admin/tickets/${id}`);
    if (!res.data.data?.ticket) {
      throw new Error(res.data.message || 'Ticket not found.');
    }
    return res.data.data.ticket;
  },

  async updateTicket(id: number, payload: UpdateTicketPayload): Promise<Ticket> {
    const res = await apiClient.patch<ApiResponse<{ ticket: Ticket }>>(
      `/admin/tickets/${id}`,
      payload
    );
    if (!res.data.data?.ticket) {
      throw new Error(res.data.message || 'Failed to update ticket.');
    }
    return res.data.data.ticket;
  },

  async addAdminMessage(id: number, message: string): Promise<TicketMessage> {
    const res = await apiClient.post<ApiResponse<{ message: TicketMessage }>>(
      `/admin/tickets/${id}/messages`,
      { message }
    );
    if (!res.data.data?.message) {
      throw new Error(res.data.message || 'Failed to post response.');
    }
    return res.data.data.message;
  },

  async addInternalNote(id: number, note: string): Promise<TicketInternalNote> {
    const res = await apiClient.post<ApiResponse<{ note: TicketInternalNote }>>(
      `/admin/tickets/${id}/notes`,
      { note }
    );
    if (!res.data.data?.note) {
      throw new Error(res.data.message || 'Failed to save internal note.');
    }
    return res.data.data.note;
  },

  async generateAIDraft(id: number): Promise<string> {
    const res = await apiClient.post<ApiResponse<{ draft?: string }>>(
      `/admin/tickets/${id}/ai-draft`
    );
    const draft = res.data.data?.draft;
    if (!draft || typeof draft !== 'string' || !draft.trim()) {
      throw new Error(res.data.message || 'AI service returned an empty or invalid draft response.');
    }
    return draft;
  },

  async getAdmins(): Promise<AdminUserSummary[]> {
    try {
      const res = await apiClient.get<ApiResponse<{ admins: AdminUserSummary[] }>>(
        '/admin/admins'
      );
      return res.data.data?.admins ?? [];
    } catch {
      return [];
    }
  },
};
