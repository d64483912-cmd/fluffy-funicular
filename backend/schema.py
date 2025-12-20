from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class ChatMode(str, Enum):
    """Valid chat modes for Nelson-GPT."""
    ACADEMIC = "academic"
    CLINICAL = "clinical"


class AiStyle(str, Enum):
    """AI response style options."""
    CONCISE = "concise"
    DETAILED = "detailed"
    BALANCED = "balanced"


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    query: str = Field(
        ..., 
        min_length=1,
        max_length=10000,
        description="User's query/question for the model"
    )
    mode: ChatMode = Field(
        ChatMode.ACADEMIC,
        description="Chat mode: 'academic' for in-depth, 'clinical' for practical guidance"
    )
    user_id: Optional[str] = Field(
        None,
        description="Optional user identifier for tracking sessions"
    )
    session_id: Optional[str] = Field(
        None,
        description="Session identifier for conversation continuity"
    )
    ai_style: Optional[AiStyle] = Field(
        AiStyle.BALANCED,
        description="Style of AI response (concise, detailed, or balanced)"
    )
    
    class Config:
        use_enum_values = True


class Citation(BaseModel):
    """Inline citation for a reference."""
    book: str = Field(
        "Nelson Textbook of Pediatrics",
        description="Name of the referenced book"
    )
    chapter: Optional[str] = Field(
        None,
        description="Chapter number or name"
    )
    section: Optional[str] = Field(
        None,
        description="Section within the chapter"
    )
    page: Optional[int] = Field(
        None,
        description="Page number in the textbook"
    )
    page_range: Optional[str] = Field(
        None,
        description="Page range (e.g., '456-458')"
    )
    
    def format(self) -> str:
        """Format citation as inline string: [Nelson, Ch. 23, p. 456]"""
        return self._format_citation()
    
    def _format_citation(self) -> str:
        """Internal method to format citation"""
        parts = ["Nelson"]
        if self.chapter:
            parts.append(f"Ch. {self.chapter}")
        if self.section:
            parts.append(f"Sec. {self.section}")
        if self.page:
            parts.append(f"p. {self.page}")
        return f"[{', '.join(parts)}]"
    
    # Pydantic model configuration for serialization
    def dict(self, **kwargs):
        """Override dict method to include computed properties"""
        data = super().dict(**kwargs)
        data['format'] = self.format()
        data['inline'] = self.format()
        return data
    
    def json(self, **kwargs):
        """Override json method to include computed properties"""
        return json.dumps(self.dict(**kwargs))

    class Config:
        json_encoders = {
            Citation: lambda v: v.dict()
        }


class Source(BaseModel):
    """Full source information for a reference."""
    id: str = Field(
        ..., 
        description="Unique source identifier"
    )
    title: str = Field(
        ..., 
        description="Title of the chapter/section"
    )
    content: str = Field(
        ..., 
        description="Relevant content excerpt"
    )
    summary: Optional[str] = Field(
        None,
        description="Summary of the content"
    )
    chapter: Optional[str] = Field(
        None,
        description="Chapter information"
    )
    section: Optional[str] = Field(
        None,
        description="Section within the chapter"
    )
    page_number: Optional[int] = Field(
        None,
        description="Starting page number"
    )
    page_range: Optional[str] = Field(
        None,
        description="Page range (e.g., '456-458')"
    )
    category: Optional[str] = Field(
        None,
        description="Medical category/type"
    )
    edition: Optional[str] = Field(
        None,
        description="Textbook edition"
    )
    url: Optional[str] = Field(
        None,
        description="Direct link to source if available"
    )
    relevance_score: Optional[float] = Field(
        None,
        description="Relevance score from vector search (0-1)"
    )
    
    def generate_citation(self) -> Citation:
        """Generate a citation from this source."""
        return Citation(
            book="Nelson Textbook of Pediatrics",
            chapter=self.chapter,
            section=self.section,
            page=self.page_number,
            page_range=self.page_range
        )


class ChatMessage(BaseModel):
    """Individual chat message."""
    role: str = Field(
        ...,
        description="'user' or 'assistant'"
    )
    content: str = Field(
        ...,
        description="Message content"
    )
    citations: Optional[List[Citation]] = Field(
        default_factory=list,
        description="Inline citations for this message"
    )
    sources: Optional[List[Source]] = Field(
        default_factory=list,
        description="Full source information"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Message timestamp"
    )


class ChatSession(BaseModel):
    """Chat session metadata."""
    session_id: str = Field(
        ...,
        description="Unique session identifier"
    )
    user_id: Optional[str] = Field(
        None,
        description="Associated user ID"
    )
    title: Optional[str] = Field(
        None,
        description="Session title"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Session creation time"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last update time"
    )
    message_count: int = Field(
        default=0,
        description="Number of messages in session"
    )
    mode: Optional[ChatMode] = Field(
        None,
        description="Primary chat mode used"
    )
    ai_style: Optional[AiStyle] = Field(
        None,
        description="AI style preference"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional session metadata"
    )
    is_pinned: bool = Field(
        default=False,
        description="Whether session is pinned"
    )


class ChatResponse(BaseModel):
    """Structured response from the chat API."""
    message: str = Field(
        ...,
        description="Generated response text"
    )
    citations: List[Citation] = Field(
        default_factory=list,
        description="Inline citations in the response"
    )
    sources: List[Source] = Field(
        default_factory=list,
        description="Full source information"
    )
    follow_up_questions: Optional[List[str]] = Field(
        default_factory=list,
        description="Suggested follow-up questions"
    )
    evidence_badges: Optional[List[str]] = Field(
        default_factory=list,
        description="Evidence level badges"
    )
    tokens_used: Optional[int] = Field(
        None,
        description="Number of tokens used in generation"
    ) 
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "According to Nelson Textbook of Pediatrics, the most common cause of pediatric pneumonia is...",
                "citations": [
                    {"book": "Nelson", "chapter": "23", "page": 456}
                ],
                "sources": [
                    {
                        "id": "nelson_ch23_p456",
                        "title": "Respiratory Infections in Children",
                        "content": "Streptococcus pneumoniae remains the leading bacterial cause of community-acquired pneumonia...",
                        "chapter": "23",
                        "page_number": 456
                    }
                ]
            }
        }


class TextbookChunk(BaseModel):
    """Textbook chunk entity for storing in Supabase."""
    id: Optional[str] = Field(
        None,
        description="UUID primary key"
    )
    book_title: str = Field(
        ...,
        description="Title of the textbook"
    )
    edition: Optional[str] = Field(
        None,
        description="Textbook edition (e.g., '21st')"
    )
    chapter_section: str = Field(
        ...,
        description="Chapter and section identifier"
    )
    content: str = Field(
        ...,
        description="Full text content of the chunk"
    )
    summary: Optional[str] = Field(
        None,
        description="Summary of the content"
    )
    category: Optional[str] = Field(
        None,
        description="Medical category (e.g., 'cardiology', 'respiratory')"
    )
    embedding: Optional[List[float]] = Field(
        None,
        description="Vector embedding (1536 dimensions)"
    )
    page_number: Optional[int] = Field(
        None,
        description="Starting page number"
    )
    page_range: Optional[str] = Field(
        None,
        description="Page range (e.g., '456-458')"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata as JSONB"
    )
    created_at: Optional[datetime] = Field(
        None,
        description="Record creation timestamp"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "book_title": "Nelson Textbook of Pediatrics",
                "edition": "21st",
                "chapter_section": "Chapter 23 - Section 2",
                "content": "Streptococcus pneumoniae remains the leading bacterial cause of community-acquired pneumonia...",
                "summary": "Epidemiology of pediatric pneumonia",
                "category": "respiratory",
                "page_number": 456,
                "metadata": {
                    "source_file": "nelson_21_ch23.csv",
                    "chunk_index": 42
                }
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response format."""
    error: str = Field(
        ...,
        description="Error message"
    )
    details: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional error details"
    )
    request_id: Optional[str] = Field(
        None,
        description="Request ID for debugging"
    )


class EmbeddingRequest(BaseModel):
    """Request for embedding generation."""
    text: str = Field(
        ...,
        min_length=1,
        max_length=8000,
        description="Text to generate embedding for"
    )
    model: Optional[str] = Field(
        None,
        description="Embedding model to use"
    )


class EmbeddingResponse(BaseModel):
    """Response from embedding generation."""
    embedding: List[float] = Field(
        ...,
        description="Vector embedding"
    )
    dimensions: int = Field(
        ...,
        description="Number of dimensions"
    )
    model: str = Field(
        ...,
        description="Model used for generation"
    )