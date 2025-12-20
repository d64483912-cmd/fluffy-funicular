import asyncio
import logging
import time
from typing import List, Dict, Any, Tuple, Optional, AsyncGenerator
from datetime import datetime
import re
from dataclasses import dataclass

import tiktoken
from langchain.vectorstores import SupabaseVectorStore
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage

from schema import Source, Citation, ChatMode, TextbookChunk, AiStyle
from config import settings
from logger import get_logger, log_rag_pipeline, log_retrieval_results, log_generation_completed

# Named constants
MAX_CONTEXT_TOKENS = 4000
MAX_TOKENS_PER_CHUNK = 800
CHUNK_OVERLAP = 200
VECTOR_SEARCH_METRIC = "cosine"
# Get numerical tolerance constant
TOLERANCE = 1e-7

@dataclass
class RetrievalResult:
    """Result from vector search."""
    content: str
    chapter_section: str
    page_number: Optional[int]
    page_range: Optional[str]
    category: Optional[str]
    edition: Optional[str]
    similarity_score: float
    metadata: Dict[str, Any]
    
    def to_source(self) -> Source:
        """Convert to Source schema."""
        source_id = f"nelson_{self.edition or 'unknown'}_{self.chapter_section}_p{self.page_number or 'unk'}"
        
        # Extract chapter and section
        chapter_match = re.search(r'Chapter\s+(\d+)', self.chapter_section)
        section_match = re.search(r'Section\s+(.*)', self.chapter_section)
        
        return Source(
            id=source_id,
            title=f"{self.chapter_section}",
            content=self.content,
            summary=self.metadata.get('summary') if self.metadata else None,
            chapter=chapter_match.group(1) if chapter_match else None,
            section=section_match.group(1) if section_match else None,
            page_number=self.page_number,
            page_range=self.page_range,
            category=self.category,
            edition=self.edition,
            metadata=self.metadata,
            relevance_score=self.similarity_score
        )

class RAGPipeline:
    """RAG Pipeline for Nelson-GPT that integrates retrieval with Mistral LLM."""
    
    def __init__(self):
        self.logger = get_logger("rag_pipeline")
        
        # Initialize API keys from settings
        self.openai_api_key = settings.OPENAI_API_KEY
        self.mistral_api_key = settings.MISTRAL_API_KEY
        
        # Initialize models and clients
        self.embedding_model = settings.EMBEDDING_MODEL
        self.embedding_dimensions = settings.EMBEDDING_DIMENSIONS
        self.chat_model = settings.CHAT_MODEL
        self.chat_temperature = settings.MISTRAL_TEMPERATURE
        self.chat_tokens = settings.MISTRAL_MAX_TOKENS
        
        # Initialize Mistral client
        self._mistral_client = None
        
        self.logger.info("RAG Pipeline initialized", 
                       embedding_model=self.embedding_model,
                       chat_model=self.chat_model)
    
    @property
    def mistral_client(self) -> MistralClient:
        """Get or create Mistral client lazily."""
        if self._mistral_client is None:
            self._mistral_client = MistralClient(api_key=self.mistral_api_key)
        return self._mistral_client
    
    def _get_embedding_model(self) -> OpenAIEmbeddings:
        """Get the configured embedding model."""
        return OpenAIEmbeddings(
            model=self.embedding_model,
            openai_api_key=self.openai_api_key
        )
    
    async def check_health(self) -> bool:
        """Check health of RAG pipeline components."""
        try:
            # Check embedding model
            embedding_model = self._get_embedding_model()
            test_embedding = await asyncio.to_thread(
                embedding_model.embed_query, "Test query"
            )
            assert len(test_embedding) == self.embedding_dimensions
            
            # Check Mistral API
            response = await asyncio.to_thread(
                self.mistral_client.chat,
                model=self.chat_model,
                messages=[ChatMessage(role="user", content="Test")],
                max_tokens=10
            )
            assert response.choices[0].message.content is not None
            
            self.logger.info("RAG pipeline health check passed")
            return True
            
        except Exception as e:
            self.logger.error("RAG pipeline health check failed", error=str(e))
            return False
    
    async def generate_query_embedding(self, text: str) -> List[float]:
        """
        Generate embeddings for query using OpenAI embedding model.
        
        Args:
            text: Query text to embed
            
        Returns:
            List[float]: Embedding vector
        """
        try:
            embedding_model = self._get_embedding_model()
            
            # Generate embedding
            embedding = await asyncio.to_thread(
                embedding_model.embed_query, text
            )
            
            self.logger.debug("Generated query embedding", dimensions=len(embedding))
            return embedding
            
        except Exception as e:
            self.logger.error("Failed to generate query embedding", error=str(e))
            raise
    
    async def retrieve_context(self, 
                              query_embedding: List[float], 
                              top_k: int = 5,
                              category: Optional[str] = None,
                              chapter: Optional[str] = None) -> List[RetrievalResult]:
        """
        Retrieve top-k most relevant chunks from Supabase vector store.
        
        Args:
            query_embedding: Query vector embedding
            top_k: Number of results to retrieve
            category: Optional category filter
            chapter: Optional chapter filter
            
        Returns:
            List[RetrievalResult]: Retrieved context chunks
        """
        try:
            # Import here to avoid circular imports
            from supabase_client import SupabaseClient
            
            # Initialize Supabase client (it will reuse existing connection)
            supabase_client = SupabaseClient()
            
            # Search for similar chunks
            similar_chunks = await supabase_client.search_similar_chunks(
                query_embedding=query_embedding,
                top_k=top_k,
                category=category,
                chapter=chapter
            )
            
            # Convert to RetrievalResult objects
            retrieval_results = []
            for chunk_data in similar_chunks:
                retrieval_result = RetrievalResult(
                    content=chunk_data.get('content', ''),
                    chapter_section=chunk_data.get('chapter_section', ''),
                    page_number=chunk_data.get('page_number'),
                    page_range=chunk_data.get('page_range'),
                    category=chunk_data.get('category'),
                    edition=chunk_data.get('edition'),
                    similarity_score=chunk_data.get('similarity_score', 0.0),
                    metadata=chunk_data.get('metadata', {})
                )
                retrieval_results.append(retrieval_result)
            
            # Log retrieval results
            log_retrieval_results(
                self.logger,
                len(retrieval_results),
                sum(r.similarity_score for r in retrieval_results) / len(retrieval_results) if retrieval_results else 0.0,
                category=category,
                chapter=chapter
            )
            
            return retrieval_results
            
        except Exception as e:
            self.logger.error("Failed to retrieve context", error=str(e))
            return []
    
    def build_system_prompt(self, mode: ChatMode) -> str:
        """Build system prompt based on mode."""
        if mode == ChatMode.ACADEMIC:
            return """You are a pediatric medical scholar with deep expertise in Nelson Textbook of Pediatrics. 

PERSONA & TONE:
- Speak as an authoritative medical scholar
- Use precise medical terminology and evidence-based reasoning
- Cite specific chapters, sections, and page numbers
- Reference landmark studies and clinical guidelines
- Acknowledge limitations and areas of uncertainty

CONTEXT USAGE:
- Base your responses primarily on the provided Nelson Textbook excerpts
- Synthesize information from multiple sources when relevant
- Build comprehensive explanations that connect pathophysiology to clinical practice
- Acknowledge when information is limited or emerging

STRUCTURE:
1. Present the core concept with strong evidence
2. Discuss clinical implications
3. Consider differential diagnoses
4. Reference specific textbook sections
5. Note controversies or evolving understanding

CITATION FORMAT:
Always cite references as: [Nelson, Ch. X, p. YYY]"""
        
        else:  # CLINICAL mode
            return """You are an experienced pediatric clinician providing practical, evidence-based guidance.

PERSONA & TONE:
- Provide actionable clinical guidance
- Emphasize practical application
- Use clear, concise language without unnecessary jargon
- Balance thoroughness with efficiency

CLINICAL FOCUS:
- Prioritize diagnostic approach and management strategies
- Include key clinical pearls and practical tips
- Mention red flags and when to refer
- Consider common pitfalls in practice

EVIDENCE INTEGRATION:
- Reference the Nelson Textbook as your primary source
- Support recommendations with specific chapter/page citations
- Distinguish between established practice and emerging approaches

CITATION FORMAT:
Always cite references as: [Nelson, Ch. X, p. YYY]"""
    
    def build_retrieval_prompt(self, 
                            query: str,
                            retrieval_results: List[RetrievalResult],
                            mode: ChatMode,
                            ai_style: AiStyle = AiStyle.BALANCED) -> str:
        """
        Build prompt with context from retrieved chunks.
        
        Args:
            query: User's question
            retrieval_results: Retrieved context chunks
            mode: Chat mode (academic/clinical)
            ai_style: AI response style preference
            
        Returns:
            Formatted prompt string
        """
        # Build system prompt
        system_prompt = self.build_system_prompt(mode)
        
        # Build context section from retrieved chunks
        context_parts = []
        for i, result in enumerate(retrieval_results, 1):
            # Format source reference
            reference = f"[Source {i}: Nelson, {result.chapter_section}"
            if result.page_number:
                reference += f", p. {result.page_number}"
            reference += "]"
            
            context_parts.append(f"{reference}\n{result.content}")
        
        context_section = "\n\n".join(context_parts)
        
        # Build instruction section based on AI style
        if ai_style == AiStyle.CONCISE:
            instruction = "Provide a concise, focused answer."
        elif ai_style == AiStyle.DETAILED:
            instruction = "Provide a comprehensive, detailed answer with multiple perspectives."
        else:  # BALANCED
            instruction = "Provide a balanced, thorough answer that is both comprehensive and clear."
        
        # Build final prompt
        prompt = f"""{system_prompt}

CONTEXT FROM NELSON TEXTBOOK:
{context_section}

INSTRUCTIONS:
- {instruction}
- Answer based on the provided context above
- Cite specific sources using the format [Nelson, Ch. X, p. YYY]
- If multiple sources are relevant, reference them appropriately
- If the context doesn't contain the answer, acknowledge this limitation

USER QUESTION: {query}

Please provide your answer with appropriate citations:"""
        
        return prompt
    
    async def generate_response_stream(self, 
                                     prompt: str,
                                     mode: ChatMode,
                                     session_id: str) -> AsyncGenerator[Tuple[str, List[Citation], bool], None]:
        """
        Generate streaming response using Mistral API.
        
        Args:
            prompt: Formatted prompt with context
            mode: Chat mode for response style
            session_id: Session identifier for tracking
            
        Yields:
            Tuple of (token, citations, is_complete)
        """
        try:
            # Build chat messages
            messages = [
                ChatMessage(role="system", content=self.build_system_prompt(mode)),
                ChatMessage(role="user", content=prompt)
            ]
            
            # Make streaming API call
            response = await asyncio.to_thread(
                self.mistral_client.chat_stream,
                model=self.chat_model,
                messages=messages,
                temperature=self.chat_temperature,
                max_tokens=self.chat_tokens
            )
            
            # Process streaming response
            full_response = ""
            accumulated_text = ""
            
            async def process_stream():
                nonlocal full_response, accumulated_text
                
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        accumulated_text += content
                        
                        # Parse citations from accumulated text
                        citations = self._parse_citations(accumulated_text)
                        
                        # Check if this is the final chunk
                        is_complete = chunk.choices[0].finish_reason is not None
                        
                        yield (content, citations, is_complete)
            
            # Process and yield tokens
            async for token, citations, is_complete in process_stream():
                yield (token, citations, is_complete)
            
            # Log completion
            self.logger.info("Response generation completed", 
                          response_length=len(full_response))
            
        except Exception as e:
            self.logger.error("Response generation failed", error=str(e))
            yield (f"[Error: Response generation failed - {str(e)}]", [], True)
    
    def _parse_citations(self, text: str) -> List[Citation]:
        """
        Parse citations from generated text.
        
        Args:
            text: Generated text that may contain citations
            
        Returns:
            List of parsed citations
        """
        citations = []
        
        # Pattern 1: [Nelson, Ch. X, p. YYY]
        pattern1 = r'\[Nelson,\s*Ch\.\s*(\d+),\s*p\.\s*(\d+)\]'
        matches = re.finditer(pattern1, text)
        for match in matches:
            chapter = match.group(1)
            page = int(match.group(2))
            citations.append(Citation(
                book="Nelson Textbook of Pediatrics",
                chapter=chapter,
                page=page
            ))
        
        # Pattern 2: [Nelson, Ch. 23.2, Sec. A, p. 456]
        pattern2 = r'\[Nelson,\s*Ch\.\s*(\d+(?:\.\d+)?),\s*(?:Sec\.\s*([^,]+),)?\s*p\.\s*(\d+)\]'
        matches = re.finditer(pattern2, text)
        for match in matches:
            chapter = match.group(1)
            section = match.group(2)
            page = int(match.group(3))
            citations.append(Citation(
                book="Nelson Textbook of Pediatrics",
                chapter=chapter,
                section=section,
                page=page
            ))
        
        return citations
    
    async def generate_response(
        self, 
        query: str, 
        mode: ChatMode, 
        session_id: str
    ) -> AsyncGenerator[Tuple[str, List[Citation], bool], None]:
        """
        Main method to generate response with RAG.
        
        Args:
            query: User query
            mode: Chat mode (academic/clinical)
            session_id: Session identifier
            
        Yields:
            Tuple of (token, citations, is_complete)
        """
        try:
            # Log pipeline start
            log_rag_pipeline(self.logger, query, mode, session_id=session_id)
            
            # Step 1: Generate query embedding
            query_embedding = await self.generate_query_embedding(query)
            
            # Step 2: Retrieve relevant context
            retrieval_results = await self.retrieve_context(
                query_embedding,
                top_k=settings.TOP_K_RESULTS
            )
            
            if not retrieval_results:
                self.logger.warning("No relevant context found", session_id=session_id)
                yield ("I couldn't find relevant information in the Nelson Textbook for your query. ", [], False)
                yield ("This might be because:", [], False)
                yield (f"\n- The topic might not be covered in the standard pediatric textbooks", [], False)
                yield (f"\n- Try rephrasing your question with different terminology", [], False)
                yield (f"\n- Consider asking about a broader topic first", [], True)
                return
            
            # Step 3: Build prompt with context
            prompt = self.build_retrieval_prompt(
                query=query,
                retrieval_results=retrieval_results,
                mode=mode
            )
            
            # Step 4: Generate streaming response
            async for token, citations, is_complete in self.generate_response_stream(
                prompt=prompt,
                mode=mode,
                session_id=session_id
            ):
                yield (token, citations, is_complete)
            
        except Exception as e:
            self.logger.error("RAG pipeline execution failed", error=str(e), session_id=session_id)
            yield (f"An error occurred while processing your request: {str(e)}", [], True)