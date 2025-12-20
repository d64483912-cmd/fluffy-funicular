export type NelsonChunkMetadata = {
  book_title?: string;
  edition?: string;
  chapter_section?: string;
  category?: string;
  page_number?: number;
  source?: string;
  [key: string]: unknown;
};

export type RetrievedChunk = {
  content: string;
  metadata: NelsonChunkMetadata;
  similarity?: number;
};

export type Citation = {
  id: string;
  title: string;
  chapter?: string;
  page?: string;
  snippet?: string;
  url?: string;
  inline?: string;
};

export type Source = {
  id: string;
  title: string;
  chapter?: string;
  page?: string;
  summary?: string;
  url?: string;
  metadata: NelsonChunkMetadata;
};
