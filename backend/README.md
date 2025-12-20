# Nelson-GPT RAG Backend

A comprehensive Retrieval-Augmented Generation (RAG) backend for Nelson-GPT, providing AI-powered pediatric knowledge retrieval with real-time streaming responses and citation tracking.

## 🚀 Features

- **Vector Search**: Fast similarity search using Supabase pgvector (1536 dimensions)
- **Streaming Responses**: Real-time token streaming via Mistral AI API
- **Smart Retrieval**: LangChain integration for optimized context retrieval
- **Citation Tracking**: Automatic extraction and formatting of textbook references
- **Chat History**: Persistent storage of conversations with metadata
- **Dual Modes**: Academic (in-depth) and Clinical (practical) response modes
- **Performance**: Sub-3-second response times with proper caching
- **Scalability**: Async processing and batch operations for 20,000+ chunks
- **Observability**: Structured logging with request tracing and metrics

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Frontend      │    │   FastAPI        │    │   Supabase       │
│   React App     │───▶│   /api/chat      │───▶│   PostgreSQL     │
│                 │    │                  │    │   pgvector         │
└─────────────────┘    └──────────────────┘    └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Mistral AI     │
                       │   Streaming API  │
                       └──────────────────┘
```

**Data Flow:**
1. Frontend sends query via POST `/api/chat`
2. FastAPI sanitizes query and stores in chat history
3. RAG pipeline generates embeddings and searches Supabase
4. Retrieved context chunks sent to Mistral AI
5. Streaming tokens returned with inline citations
6. Chat history updated with full response and citations

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **API Framework** | FastAPI (Python 3.11+) |
| **Database** | Supabase (PostgreSQL 15 + pgvector) |
| **Embeddings** | OpenAI text-embedding-3-small (1536 dims) |
| **LLM** | Mistral AI (mistral-large) |
| **Vector Search** | pgvector with ivfflat indexing |
| **Orchestration** | LangChain with custom retrievers |
| **Caching** | Redis (optional, for embeddings) |
| **Monitoring** | Structured logging with structlog |
| **Testing** | pytest with async support |

## 🔧 Prerequisites

- Python 3.11 or higher
- Supabase account with pgvector enabled
- OpenAI API key (for embeddings)
- Mistral AI API key (for chat completions)
- 8GB+ RAM recommended for batch processing

## 📦 Installation

### 1. Clone and Setup

```bash
git clone <repository-url>
cd nelson-gpt/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Required: Supabase configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Required: API keys
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=...

# Optional: Custom settings
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=mistral-large
TOP_K_RESULTS=5
```

### 3. Database Setup

#### Option A: Use Supabase SQL Editor

1. Go to your Supabase project → SQL Editor
2. Copy contents of `sql/schema.sql`
3. Run the SQL to create tables and indexes

#### Option B: Use CLI (if available)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-id

# Push schema
supabase db push
```

### 4. Import Textbook Chunks

Prepare your CSV with columns:
- `content` (required): Text content
- `chapter_section` (required): Chapter info
- `page_number`: Page number
- `summary`: Content summary
- `category`: Medical category
- `edition`: Textbook edition

Run the import script:

```bash
python scripts/import_nelson_chunks.py --csv ./data/nelson_chunks.csv
```

For large imports, use batch processing:

```bash
# Process in batches of 100
python scripts/import_nelson_chunks.py --batch-size 100

# Test with small sample first
python scripts/import_nelson_chunks.py --test
```

## 🚀 Running the Server

### Development

```bash
# Run with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Or using Python
python main.py
```

### Production

```bash
# Using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4

# Using gunicorn with uvicorn workers
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

### Docker

```bash
# Build image
docker build -t nelson-gpt-backend .

# Run container
docker run -p 8000:8000 --env-file .env nelson-gpt-backend
```

## 📡 API Endpoints

### POST `/api/chat`

Main chat endpoint with streaming responses.

**Request:**

```json
{
  "query": "What are the most common causes of pediatric pneumonia?",
  "mode": "clinical",
  "session_id": "uuid-here",
  "ai_style": "balanced"
}
```

**Response:**
Server-Sent Events (SSE) stream:

```
data: {"token": "The", "citations": [], "is_complete": false}

data: {"token": " most", "citations": [], "is_complete": false}

data: {"token": " common", "citations": [], "is_complete": false}

data: {"token": " causes...", "citations": [{"book": "Nelson", "chapter": "23", "page": 456}], "is_complete": false}

data: [DONE]
```

### GET `/api/chat/history/{session_id}`

Retrieve chat history for a session.

**Response:**
```json
{
  "session_id": "uuid-here",
  "history": [
    {
      "role": "user",
      "content": "What causes pediatric pneumonia?",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "According to Nelson Textbook...",
      "citations": [...],
      "sources": [...],
      "timestamp": "2024-01-15T10:30:05Z"
    }
  ]
}
```

### POST `/api/chat/sessions`

Create a new chat session.

**Request:**
```json
{
  "user_id": "optional-user-id",
  "metadata": {"referrer": "mobile_app"}
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "nelson-gpt-rag"
}
```

### GET `/api/ready`

Readiness check (includes RAG pipeline health).

## 📊 Monitoring and Logging

Structured JSON logs are emitted for all operations:

```json
{
  "event": "RAG pipeline execution started",
  "query_length": 45,
  "mode": "clinical",
  "session_id": "...",
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info"
}
```

Key log events:
- `RAG pipeline execution started`: Pipeline initialization
- `Retrieval completed`: Vector search results
- `Response generation completed`: Mistral streaming finished
- `Failed to generate embedding`: Error during embedding generation

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=src/ --cov-report=html

# Run specific test
pytest tests/test_rag_pipeline.py::test_generate_query_embedding
```

### Test Coverage

- ✅ Embedding generation and validation
- ✅ Vector search accuracy
- ✅ Response streaming
- ✅ Citation extraction
- ✅ Error handling and retries
- ✅ Rate limiting compliance
- ✅ Chat history persistence

## 📈 Performance Optimization

### Vector Search Tuning

```sql
-- Adjust based on your dataset size
ALTER INDEX idx_nelson_chunks_embedding_cosine SET (lists = 200); -- More lists = faster search, less accurate
SET ivfflat.probes = 10; -- More probes = more accurate, slower
```

### Connection Pooling

Configure database connection pool in Supabase:
- Max connections: Based on your plan (50-500)
- Use connection pooling for serverless deployments

### Caching Strategy

```python
# Optional: Cache frequent queries
from functools import lru_cache

@lru_cache(maxsize=128)
def cached_embedding(text: str) -> List[float]:
    return generate_embedding(text)
```

### Rate Limit Management

Respect API limits:
- OpenAI: 3,500 RPM (embedding), 10,000 TPM
- Mistral: 5 requests/second per token

## 🔐 Security Considerations

### Environment Variables

- Never commit `.env` files
- Use secrets management (AWS Secrets Manager, Google Secret Manager)
- Rotate API keys regularly
- Restrict Supabase row-level security policies

### Input Validation

- Query length limits (10,000 chars max)
- Rate limiting per user/session
- SQL injection prevention in custom queries
- XSS protection in markdown rendering

### Row Level Security

Default policies are created in `schema.sql`. Adjust based on your auth setup:

```sql
-- Example: Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON chat_sessions
    FOR SELECT USING (auth.uid()::text = user_id);
```

## 🚑 Troubleshooting

### Import Slow or Failing

**Problem:** Import script times out or hits rate limits

**Solution:**
```bash
# Reduce batch size
python scripts/import_nelson_chunks.py --batch-size 50

# Use exponential backoff (already implemented)
# Check network connectivity to Supabase
```

### Vector Search Returning No Results

**Problem:** Search finds no relevant chunks

**Solution:**
1. Check embeddings exist in database:
```sql
SELECT COUNT(*) FROM nelson_textbook_chunks WHERE embedding IS NULL;
```
2. Verify similarity threshold:
```python
# Lower threshold in rag_pipeline.py
match_threshold = 0.6  # Was 0.8
```
3. Check pgvector indexes:
```sql
SELECT * FROM pg_indexes WHERE tablename = 'nelson_textbook_chunks';
```

### Streaming Responses Not Working

**Problem:** Frontend receives empty responses

**Solution:**
1. Check Mistral API key validity
2. Verify network allows SSE (Server-Sent Events)
3. Check browser console for CORS errors
4. Test with cURL:
```bash
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "mode": "clinical"}'
```

### Database Connection Errors

**Problem:** Connection to Supabase fails

**Solution:**
1. Verify network connectivity
2. Check Supabase URL format: `https://your-project.supabase.co`
3. Ensure service role key (not anon key) for backend
4. Review connection pooling settings

## 📚 Data Schema

### nelson_textbook_chunks

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| book_title | TEXT | Textbook title |
| edition | TEXT | Edition (e.g., "21st") |
| chapter_section | TEXT | Chapter info |
| content | TEXT | Full text content |
| summary | TEXT | Summary |
| embedding | VECTOR(1536) | OpenAI embedding |
| page_number | INTEGER | Page number |
| metadata | JSONB | Additional metadata |

### chat_sessions

| Column | Type | Description |
|--------|------|-------------|
| session_id | TEXT | Primary key |
| user_id | TEXT | Optional user ID |
| title | TEXT | Session title |
| message_count | INTEGER | Message count |
| mode | VARCHAR(20) | academic/clinical |
| is_pinned | BOOLEAN | Pin status |

### chat_history

| Column | Type | Description |
|--------|------|-------------|
| session_id | TEXT | Session reference |
| query | TEXT | User question |
| response | TEXT | AI answer |
| citations | JSONB | Inline citations |
| sources | JSONB | Full source info |
| tokens_used | INTEGER | Token count |

## 🤝 Contributing

1. Follow PEP 8 style guidelines
2. Add tests for new features
3. Update documentation
4. Use type hints
5. Follow existing code patterns

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check `docs/` directory
- **Issues**: Create GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: support@nelson-gpt.com

---

**Nelson-GPT RAG Backend** - Empowering pediatric knowledge with AI-powered retrieval and generation.