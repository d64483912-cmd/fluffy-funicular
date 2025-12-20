/**
 * TypeScript type definitions for Nelson-GPT API
 * These mirror the backend Pydantic models in backend/schema.py
 */

export type ChatMode = 'academic' | 'clinical';

export type AiStyle = 'concise' | 'detailed' | 'balanced';

export interface ChatRequest {
  query: string;
  mode: ChatMode;
  user_id?: string;
  session_id?: string;
  ai_style?: AiStyle;
}

export interface Citation {
  book: string;
  chapter?: string;
  section?: string;
  page?: number;
  page_range?: string;
  format(): string; // Method to format citation
  inline: string; // Computed property for formatted string
}

export interface Source {
  id: string;
  title: string;
  content: string;
  summary?: string;
  chapter?: string;
  section?: string;
  page_number?: number;
  page_range?: string;
  category?: string;
  edition?: string;
  url?: string;
  relevance_score?: number;
  generate_citation(): Citation;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  sources?: Source[];
  timestamp: string;
}

export interface ChatSession {
  session_id: string;
  user_id?: string;
  title?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  mode?: ChatMode;
  ai_style?: AiStyle;
  metadata: Record<string, any>;
  is_pinned: boolean;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  sources: Source[];
  follow_up_questions?: string[];
  evidence_badges?: string[];
  tokens_used?: number;
}

export interface TextbookChunk {
  id?: string;
  book_title: string;
  edition?: string;
  chapter_section: string;
  content: string;
  summary?: string;
  category?: string;
  embedding?: number[];
  page_number?: number;
  page_range?: string;
  metadata: Record<string, any>;
  created_at?: string;
}

export interface ErrorResponse {
  error: string;
  details?: Record<string, any>;
  request_id?: string;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
}

// Streaming response types
export interface StreamChunk {
  token: string;
  citations: Citation[];
  is_complete: boolean;
}

// API endpoint response types
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
}

export interface ReadyResponse {
  status: 'ready' | 'not_ready';
  details?: Record<string, any>;
}

export interface ChatHistoryResponse {
  session_id: string;
  history: ChatMessage[];
}

export interface CreateSessionResponse {
  session_id: string;
}

export interface SessionTitleResponse {
  success: boolean;
}

/**
 * Type guards for runtime validation
 */

export function isCitation(obj: any): obj is Citation {
  return (
    obj &&
    typeof obj.book === 'string' &&
    (obj.chapter === undefined || typeof obj.chapter === 'string') &&
    (obj.section === undefined || typeof obj.section === 'string') &&
    (obj.page === undefined || typeof obj.page === 'number') &&
    (obj.page_range === undefined || typeof obj.page_range === 'string')
  );
}

export function isSource(obj: any): obj is Source {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.content === 'string'
  );
}

export function isChatMessage(obj: any): obj is ChatMessage {
  return (
    obj &&
    (obj.role === 'user' || obj.role === 'assistant') &&
    typeof obj.content === 'string' &&
    typeof obj.timestamp === 'string'
  );
}

/**
 * Helper functions for working with citations
 */

export function formatCitation(citation: Citation): string {
  return citation.format();
}

export function formatCitationInline(citation: Citation): string {
  return citation.inline;
}

export function createCitation(data: {
  book?: string;
  chapter?: string;
  section?: string;
  page?: number;
  page_range?: string;
}): Citation {
  return {
    book: data.book || 'Nelson Textbook of Pediatrics',
    chapter: data.chapter,
    section: data.section,
    page: data.page,
    page_range: data.page_range,
    format(): string {
      const parts = ['Nelson'];
      if (this.chapter) parts.push(`Ch. ${this.chapter}`);
      if (this.section) parts.push(`Sec. ${this.section}`);
      if (this.page) parts.push(`p. ${this.page}`);
      return `[${parts.join(', ')}]`;
    },
    get inline(): string {
      return this.format();
    },
  };
}

/**
 * API client interfaces
 */

export interface ApiClient {
  chat(request: ChatRequest): Promise<ReadableStream<StreamChunk>>;
  getSessionHistory(sessionId: string, userId?: string): Promise<ChatHistoryResponse>;
  createSession(userId?: string, metadata?: Record<string, any>): Promise<CreateSessionResponse>;
  updateSessionTitle(sessionId: string, title: string, userId?: string): Promise<SessionTitleResponse>;
  healthCheck(): Promise<HealthResponse>;
  readyCheck(): Promise<ReadyResponse>;
}

/**
 * Utility types for API responses
 */

export type ApiResponse<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: ErrorResponse;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
};

/**
 * Frontend-specific type extensions
 */

export interface CitationWithElement extends Citation {
  element: JSX.Element;
}

export interface SourceWithMetadata extends Source {
  displayUrl?: string;
  lastUpdated?: string;
  confidence?: number;
}

/**
 * Type mappings for backend responses
 * Ensures consistency between backend Pydantic models and frontend interfaces
 */

export type BackendCitation = {
  book: string;
  chapter?: string;
  section?: string;
  page?: number;
  page_range?: string;
  format?: string; // Serialized from format() method
  inline?: string;
};

export function mapBackendCitation(backendCitation: BackendCitation): Citation {
  return createCitation({
    book: backendCitation.book,
    chapter: backendCitation.chapter,
    section: backendCitation.section,
    page: backendCitation.page,
    page_range: backendCitation.page_range,
  });
}

export function mapBackendSource(backendSource: any): Source {
  return {
    id: backendSource.id,
    title: backendSource.title,
    content: backendSource.content,
    summary: backendSource.summary,
    chapter: backendSource.chapter,
    section: backendSource.section,
    page_number: backendSource.page_number,
    page_range: backendSource.page_range,
    category: backendSource.category,
    edition: backendSource.edition,
    url: backendSource.url,
    relevance_score: backendSource.relevance_score,
    generate_citation(): Citation {
      return createCitation({
        book: 'Nelson Textbook of Pediatrics',
        chapter: this.chapter,
        section: this.section,
        page: this.page_number,
        page_range: this.page_range,
      });
    },
  };
}

/**
 * Validation schemas (can be used with Zod or similar)
 */

export const CitationSchema = {
  book: 'string',
  chapter: 'string?',
  section: 'string?',
  page: 'number?',
  page_range: 'string?',
  format: 'function',
  inline: 'string',
};

export const SourceSchema = {
  id: 'string',
  title: 'string',
  content: 'string',
  summary: 'string?',
  chapter: 'string?',
  section: 'string?',
  page_number: 'number?',
  page_range: 'string?',
  category: 'string?',
  edition: 'string?',
  url: 'string?',
  relevance_score: 'number?',
  generate_citation: 'function',
};

/**
 * Constants
 */

export const DEFAULT_BOOK_TITLE = 'Nelson Textbook of Pediatrics';

export const VALID_CHAT_MODES: ChatMode[] = ['academic', 'clinical'];

export const VALID_AI_STYLES: AiStyle[] = ['concise', 'detailed', 'balanced'];

/**
 * Error types
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT', details);
    this.name = 'RateLimitError';
  }
}

/**
 * Type guards for error types
 */

export function isApiError(error: any): error is ApiError {
  return error instanceof Error && 'statusCode' in error;
}

export function isValidationError(error: any): error is ValidationError {
  return isApiError(error) && error.errorCode === 'VALIDATION_ERROR';
}

export function isNotFoundError(error: any): error is NotFoundError {
  return isApiError(error) && error.errorCode === 'NOT_FOUND';
}

export function isRateLimitError(error: any): error is RateLimitError {
  return isApiError(error) && error.errorCode === 'RATE_LIMIT';
}