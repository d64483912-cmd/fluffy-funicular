-- ============================================================================
-- NELSON-GPT RAG DATABASE SCHEMA
-- PostgreSQL with pgvector extension
-- ============================================================================

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create custom type for vector similarity search operation class
-- Note: pgvector automatically provides cosine_distance, l2_distance, and inner_product

-- ============================================================================
-- TABLE: nelson_textbook_chunks
-- Stores textbook chunks with embeddings for vector similarity search
-- ============================================================================

CREATE TABLE IF NOT EXISTS nelson_textbook_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_title TEXT NOT NULL DEFAULT 'Nelson Textbook of Pediatrics',
    edition TEXT,
    chapter_section TEXT NOT NULL, -- e.g., "Chapter 23 - Section 2", "Ch. 23.2"
    content TEXT NOT NULL,
    summary TEXT,
    category TEXT, -- e.g., "cardiology", "respiratory", "neurology"
    
    -- Vector embedding (dimension configurable, default 1536 for text-embedding-3-small)
    embedding VECTOR(1536),
    
    -- Reference information
    page_number INTEGER,
    page_range TEXT, -- e.g., "456-458"
    
    -- Additional metadata as JSONB
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_nelson_chunks_embedding_cosine 
    ON nelson_textbook_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for L2 distance (optional)
CREATE INDEX IF NOT EXISTS idx_nelson_chunks_embedding_l2 
    ON nelson_textbook_chunks USING ivfflat (embedding vector_l2_ops)
    WITH (lists = 100);

-- Regular indexes for filtering
CREATE INDEX IF NOT EXISTS idx_nelson_chunks_category 
    ON nelson_textbook_chunks(category);

CREATE INDEX IF NOT EXISTS idx_nelson_chunks_chapter 
    ON nelson_textbook_chunks(chapter_section);

CREATE INDEX IF NOT EXISTS idx_nelson_chunks_page_number 
    ON nelson_textbook_chunks(page_number);

CREATE INDEX IF NOT EXISTS idx_nelson_chunks_created 
    ON nelson_textbook_chunks(created_at DESC);

-- GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_nelson_chunks_metadata 
    ON nelson_textbook_chunks USING GIN (metadata);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_nelson_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nelson_chunks_updated_at
    BEFORE UPDATE ON nelson_textbook_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_nelson_chunks_updated_at();


-- ============================================================================
-- TABLE: chat_sessions
-- Stores chat session metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT, -- Optional user identifier
    
    -- Session information
    title TEXT DEFAULT 'New Conversation',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Statistics
    message_count INTEGER DEFAULT 0,
    
    -- Preferences
    mode VARCHAR(20) CHECK (mode IN ('academic', 'clinical')),
    ai_style VARCHAR(20) CHECK (ai_style IN ('concise', 'detailed', 'balanced')),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Flags
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Who created/updated
    created_by TEXT,
    updated_by TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user 
    ON chat_sessions(user_id) 
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated 
    ON chat_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_created 
    ON chat_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_pinned 
    ON chat_sessions(is_pinned) 
    WHERE is_pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived 
    ON chat_sessions(is_archived) 
    WHERE is_archived = FALSE;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_sessions_updated_at();


-- ============================================================================
-- TABLE: chat_history
-- Stores individual chat messages with citations and sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id TEXT, -- Optional user identifier
    
    -- Message content
    query TEXT NOT NULL, -- User's original question
    response TEXT NOT NULL, -- AI's response
    
    -- Citations and sources (stored as JSONB)
    citations JSONB DEFAULT '[]'::jsonb, -- List of Citation objects
    sources JSONB DEFAULT '[]'::jsonb, -- List of Source objects
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Preferences used
    mode VARCHAR(20) CHECK (mode IN ('academic', 'clinical')),
    ai_style VARCHAR(20) CHECK (ai_style IN ('concise', 'detailed', 'balanced')),
    
    -- Usage stats
    tokens_used INTEGER,
    
    -- Response quality
    feedback_score INTEGER, -- 1-5 rating
    feedback_notes TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_history_session 
    ON chat_history(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_session_timestamp 
    ON chat_history(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_chat_history_user 
    ON chat_history(user_id) 
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp 
    ON chat_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_chat_history_mode 
    ON chat_history(mode) 
    WHERE mode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_history_session_user 
    ON chat_history(session_id, user_id);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_chat_history_citations 
    ON chat_history USING GIN (citations jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_chat_history_sources 
    ON chat_history USING GIN (sources jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_chat_history_metadata 
    ON chat_history USING GIN (metadata);

-- Foreign key constraint (optional, could impact performance)
ALTER TABLE chat_history
ADD CONSTRAINT fk_chat_history_session 
FOREIGN KEY (session_id) 
REFERENCES chat_sessions(session_id)
ON DELETE CASCADE;


-- ============================================================================
-- TABLE: rag_feedback
-- Stores feedback on RAG responses for continuous improvement
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    
    -- Feedback type
    feedback_type VARCHAR(50) NOT NULL, -- e.g., 'helpful', 'inaccurate', 'incomplete', 'hallucination'
    
    -- Ratings
    helpful BOOLEAN,
    accuracy_score INTEGER CHECK (accuracy_score BETWEEN 1 AND 5),
    completeness_score INTEGER CHECK (completeness_score BETWEEN 1 AND 5),
    
    -- Details
    expected_answer TEXT,
    corrections TEXT,
    additional_notes TEXT,
    
    -- Metadata
    user_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_feedback_message 
    ON rag_feedback(message_id);

CREATE INDEX IF NOT EXISTS idx_rag_feedback_session 
    ON rag_feedback(session_id);

CREATE INDEX IF NOT EXISTS idx_rag_feedback_type 
    ON rag_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_rag_feedback_timestamp 
    ON rag_feedback(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rag_feedback_user 
    ON rag_feedback(user_id) 
    WHERE user_id IS NOT NULL;


-- ============================================================================
-- VIEWS: Analytics and Reporting
-- ============================================================================

-- View: Session statistics
CREATE OR REPLACE VIEW vw_session_stats AS
SELECT 
    cs.session_id,
    cs.user_id,
    cs.title,
    cs.created_at,
    cs.updated_at,
    cs.message_count,
    cs.mode,
    cs.ai_style,
    cs.is_pinned,
    cs.is_archived,
    COUNT(ch.id) as actual_message_count,
    AVG(ch.tokens_used) as avg_tokens_per_message,
    MAX(ch.timestamp) as last_activity
FROM chat_sessions cs
LEFT JOIN chat_history ch ON cs.session_id = ch.session_id
GROUP BY cs.session_id, cs.user_id, cs.title, cs.created_at, cs.updated_at, 
         cs.message_count, cs.mode, cs.ai_style, cs.is_pinned, cs.is_archived;

-- View: Model usage statistics
CREATE OR REPLACE VIEW vw_model_usage_stats AS
SELECT 
    DATE(timestamp) as date,
    mode,
    ai_style,
    COUNT(*) as total_messages,
    SUM(tokens_used) as total_tokens,
    AVG(tokens_used) as avg_tokens,
    AVG(LENGTH(response)) as avg_response_length,
    AVG(LENGTH(query)) as avg_query_length
FROM chat_history
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp), mode, ai_style
ORDER BY date DESC, mode, ai_style;

-- View: Citation statistics
CREATE OR REPLACE VIEW vw_citation_stats AS
SELECT 
    ch.session_id,
    COUNT(citations) as citations_per_message,
    COUNT(DISTINCT citations->>'chapter') as unique_chapters_cited,
    AVG(LENGTH(citations::text)) as avg_citation_detail
FROM chat_history ch
WHERE citations IS NOT NULL AND jsonb_array_length(citations) > 0
GROUP BY ch.session_id;


-- ============================================================================
-- STORED PROCEDURES: Utility Functions
-- ============================================================================

-- Function: Search textbook chunks with vector similarity
CREATE OR REPLACE FUNCTION search_nelson_chunks(
    query_embedding VECTOR,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    book_title TEXT,
    edition TEXT,
    chapter_section TEXT,
    content TEXT,
    summary TEXT,
    page_number INTEGER,
    page_range TEXT,
    category TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ntc.id,
        ntc.book_title,
        ntc.edition,
        ntc.chapter_section,
        ntc.content,
        ntc.summary,
        ntc.page_number,
        ntc.page_range,
        ntc.category,
        1 - (ntc.embedding <=> query_embedding) AS similarity
    FROM nelson_textbook_chunks ntc
    WHERE 
        (category_filter IS NULL OR ntc.category = category_filter)
        AND (1 - (ntc.embedding <=> query_embedding)) >= match_threshold
    ORDER BY ntc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;


-- Function: Update session message count
CREATE OR REPLACE FUNCTION update_session_message_count(
    p_session_id TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE chat_sessions 
    SET 
        message_count = (
            SELECT COUNT(*) 
            FROM chat_history 
            WHERE session_id = p_session_id
        ),
        updated_at = NOW()
    WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;


-- Function: Archive old sessions
CREATE OR REPLACE FUNCTION archive_old_sessions(
    days_old INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE chat_sessions 
    SET is_archived = TRUE,
        updated_at = NOW()
    WHERE 
        updated_at < NOW() - (days_old || ' days')::INTERVAL
        AND is_archived = FALSE;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE nelson_textbook_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Note: These are templates. Adjust based on your authentication setup

-- Policy: Users can read textbook chunks
CREATE POLICY "Users can view textbook chunks" ON nelson_textbook_chunks
    FOR SELECT USING (true);

-- Policy: Users can manage their own sessions
CREATE POLICY "Users can manage own sessions" ON chat_sessions
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own sessions" ON chat_sessions
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can manage their own chat history
CREATE POLICY "Users can manage own history" ON chat_history
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own history" ON chat_history
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can submit feedback
CREATE POLICY "Users can submit feedback" ON rag_feedback
    FOR INSERT WITH CHECK (true);

-- Policy: Users can view own feedback
CREATE POLICY "Users can view own feedback" ON rag_feedback
    FOR SELECT USING (auth.uid()::text = user_id);