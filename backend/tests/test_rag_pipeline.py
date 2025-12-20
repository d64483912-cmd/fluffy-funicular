import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
import json

# Add parent directory to path
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from schema import ChatMode, Citation, Source, AiStyle
from rag_pipeline import RAGPipeline, RetrievalResult
from config import settings


class TestRAGPipeline:
    """Test suite for RAGPipeline class."""
    
    @pytest.fixture
    def rag_pipeline(self):
        """Create RAGPipeline instance for testing."""
        with patch.dict('os.environ', {
            'OPENAI_API_KEY': 'test-key',
            'MISTRAL_API_KEY': 'test-key'
        }):
            pipeline = RAGPipeline()
            pipeline._mistral_client = Mock()
            return pipeline
    
    @pytest.fixture
    def sample_query(self):
        """Sample medical query."""
        return "What are the common causes of pediatric pneumonia?"
    
    @pytest.fixture
    def sample_embedding(self):
        """Sample embedding vector."""
        return [0.1] * 1536  # 1536 dimensions
    
    @pytest.fixture
    def sample_retrieval_results(self):
        """Sample retrieval results."""
        return [
            RetrievalResult(
                content="Streptococcus pneumoniae remains the leading bacterial cause of community-acquired pneumonia in children.",
                chapter_section="Chapter 23 - Respiratory Infections",
                page_number=456,
                page_range="456-458",
                category="Respiratory",
                edition="21st",
                similarity_score=0.92,
                metadata={"source_file": "nelson_21_ch23.csv"}
            ),
            RetrievalResult(
                content="Viral pneumonia is common in children under 5 years, often caused by RSV and influenza.",
                chapter_section="Chapter 23 - Respiratory Infections",
                page_number=457,
                page_range="456-458",
                category="Respiratory",
                edition="21st",
                similarity_score=0.88,
                metadata={"source_file": "nelson_21_ch23.csv"}
            )
        ]
    
    def test_initialization(self, rag_pipeline):
        """Test RAGPipeline initialization."""
        assert rag_pipeline.openai_api_key == 'test-key'
        assert rag_pipeline.mistral_api_key == 'test-key'
        assert rag_pipeline.embedding_model == settings.EMBEDDING_MODEL
        assert rag_pipeline.chat_model == settings.CHAT_MODEL
    
    @pytest.mark.asyncio
    async def test_generate_query_embedding(self, rag_pipeline, sample_query):
        """Test query embedding generation."""
        with patch('rag_pipeline.OpenAIEmbeddings') as mock_embeddings:
            mock_instance = Mock()
            mock_instance.embed_query.return_value = [0.1] * 1536
            mock_embeddings.return_value = mock_instance
            
            embedding = await rag_pipeline.generate_query_embedding(sample_query)
            
            assert len(embedding) == 1536
            mock_instance.embed_query.assert_called_once_with(sample_query)
    
    @pytest.mark.asyncio
    async def test_retrieve_context(self, rag_pipeline, sample_embedding):
        """Test context retrieval."""
        mock_supabase_client = Mock()
        mock_supabase_client.search_similar_chunks = AsyncMock(return_value=[
            {
                'content': 'Test content',
                'chapter_section': 'Chapter 1',
                'similarity_score': 0.95,
                'metadata': {}
            }
        ])
        
        with patch('rag_pipeline.SupabaseClient', return_value=mock_supabase_client):
            results = await rag_pipeline.retrieve_context(sample_embedding, top_k=5)
            
            assert len(results) == 1
            assert isinstance(results[0], RetrievalResult)
            assert results[0].similarity_score == 0.95
    
    def test_build_system_prompt_academic(self, rag_pipeline):
        """Test system prompt building for academic mode."""
        prompt = rag_pipeline.build_system_prompt(ChatMode.ACADEMIC)
        
        assert "medical scholar" in prompt.lower()
        assert "Nelson Textbook of Pediatrics" in prompt
        assert "CITATION FORMAT" in prompt
        assert "[Nelson, Ch. X, p. YYY]" in prompt
    
    def test_build_system_prompt_clinical(self, rag_pipeline):
        """Test system prompt building for clinical mode."""
        prompt = rag_pipeline.build_system_prompt(ChatMode.CLINICAL)
        
        assert "clinician" in prompt.lower()
        assert "practical" in prompt.lower()
        assert "Nelson Textbook of Pediatrics" in prompt
        assert "CITATION FORMAT" in prompt
    
    def test_build_retrieval_prompt(self, rag_pipeline, sample_query, sample_retrieval_results):
        """Test retrieval prompt building."""
        prompt = rag_pipeline.build_retrieval_prompt(
            sample_query,
            sample_retrieval_results,
            ChatMode.ACADEMIC,
            AiStyle.BALANCED
        )
        
        assert "USER QUESTION:" in prompt
        assert sample_query in prompt
        assert "[Source 1:" in prompt
        assert "[Source 2:" in prompt
        assert "Streptococcus pneumoniae" in prompt
        assert "Viral pneumonia" in prompt
    
    def test_parse_citations_basic(self, rag_pipeline):
        """Test basic citation parsing."""
        text = "According to [Nelson, Ch. 23, p. 456] and [Nelson, Ch. 24, p. 500]"
        
        citations = rag_pipeline._parse_citations(text)
        
        assert len(citations) == 2
        assert citations[0].chapter == "23"
        assert citations[0].page == 456
        assert citations[1].chapter == "24"
        assert citations[1].page == 500
    
    def test_parse_citations_with_section(self, rag_pipeline):
        """Test citation parsing with section information."""
        text = "As stated in [Nelson, Ch. 23.2, Sec. A, p. 456]"
        
        citations = rag_pipeline._parse_citations(text)
        
        assert len(citations) == 1
        assert citations[0].chapter == "23.2"
        assert citations[0].section == "A"
        assert citations[0].page == 456
    
    def test_parse_citations_no_matches(self, rag_pipeline):
        """Test citation parsing with no matches."""
        text = "This text has no citations"
        
        citations = rag_pipeline._parse_citations(text)
        
        assert len(citations) == 0
    
    @pytest.mark.asyncio
    async def test_generate_response_stream(self, rag_pipeline):
        """Test streaming response generation."""
        mock_response = [
            Mock(choices=[Mock(delta=Mock(content="First"), finish_reason=None)]),
            Mock(choices=[Mock(delta=Mock(content=" Second"), finish_reason=None)]),
            Mock(choices=[Mock(delta=Mock(content="."), finish_reason="stop")]),
        ]
        
        rag_pipeline.mistral_client.chat_stream = Mock(return_value=mock_response)
        
        collected_tokens = []
        async for token, citations, is_complete in rag_pipeline.generate_response_stream(
            "Test prompt", ChatMode.ACADEMIC, "test-session"
        ):
            collected_tokens.append((token, citations, is_complete))
        
        assert len(collected_tokens) == 3
        assert collected_tokens[0] == ("First", [], False)
        assert collected_tokens[2][2] is True  # is_complete should be True for last token
        assert rag_pipeline.mistral_client.chat_stream.called
    
    @pytest.mark.asyncio
    async def test_generate_response_full_pipeline(self, rag_pipeline, sample_query):
        """Test full RAG pipeline execution."""
        # Mock embedding
        with patch.object(rag_pipeline, 'generate_query_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            # Mock retrieval
            with patch.object(rag_pipeline, 'retrieve_context', new_callable=AsyncMock) as mock_retrieve:
                mock_retrieve.return_value = [
                    RetrievalResult(
                        content="Test content",
                        chapter_section="Chapter 1",
                        page_number=1,
                        similarity_score=0.9,
                        metadata={}
                    )
                ]
                
                # Mock response stream
                with patch.object(rag_pipeline, 'generate_response_stream') as mock_stream:
                    async def mock_stream_gen():
                        yield ("Test", [], False)
                        yield (" response", [], True)
                    
                    mock_stream.return_value = mock_stream_gen()
                    mock_stream.return_value.__aiter__ = lambda self: self
                    mock_stream.return_value.__anext__ = lambda self: self.send(None)
                    
                    collected = []
                    async for token, citations, is_complete in rag_pipeline.generate_response(
                        sample_query, ChatMode.ACADEMIC, "test-session"
                    ):
                        collected.append((token, citations, is_complete))
                    
                    assert len(collected) == 2
                    assert collected[1][2] is True
    
    def test_citation_format_basic(self):
        """Test citation formatting."""
        citation = Citation(chapter="23", page=456)
        
        assert citation.format() == "[Nelson, Ch. 23, p. 456]"
        assert citation.inline == "[Nelson, Ch. 23, p. 456]"
    
    def test_citation_format_complete(self):
        """Test citation formatting with all fields."""
        citation = Citation(
            chapter="23.2",
            section="A",
            page=456,
            page_range="456-458"
        )
        
        assert "Ch. 23.2" in citation.format()
        assert "Sec. A" in citation.format()
        assert "p. 456" in citation.format()
    
    def test_source_to_citation(self, sample_retrieval_results):
        """Test Source generation_citation method."""
        source = sample_retrieval_results[0].to_source()
        citation = source.generate_citation()
        
        assert isinstance(citation, Citation)
        assert citation.chapter is not None
        assert citation.page is not None
        assert "Nelson" in citation.format()


class TestConfig:
    """Test configuration and settings."""
    
    def test_settings_validation(self):
        """Test that settings are properly configured."""
        assert settings.EMBEDDING_DIMENSIONS == 1536
        assert settings.TOP_K_RESULTS >= 1
        assert settings.TOP_K_RESULTS <= 20
        assert settings.MISTRAL_MAX_TOKENS > 0
        assert settings.MISTRAL_TEMPERATURE >= 0.0
        assert settings.MISTRAL_TEMPERATURE <= 2.0
    
    def test_settings_env_vars(self, monkeypatch):
        """Test settings from environment variables."""
        monkeypatch.setenv("EMBEDDING_MODEL", "text-embedding-3-large")
        monkeypatch.setenv("TOP_K_RESULTS", "10")
        
        from config import Settings
        test_settings = Settings()
        
        assert test_settings.EMBEDDING_MODEL == "text-embedding-3-large"
        assert test_settings.TOP_K_RESULTS == 10


class TestChatHistory:
    """Test chat history management."""
    
    @pytest.fixture
    def chat_manager(self):
        """Create ChatHistoryManager instance."""
        from chat_history import ChatHistoryManager
        return ChatHistoryManager()
    
    @pytest.mark.asyncio
    async def test_create_session(self, chat_manager):
        """Test session creation."""
        with patch('chat_history.SupabaseClient') as mock_client:
            mock_instance = Mock()
            mock_instance.client = Mock()
            mock_instance.client.table = Mock()
            mock_instance.client.table.return_value.insert = Mock()
            mock_instance.client.table.return_value.insert.return_value.execute = AsyncMock()
            
            session_id = await chat_manager.create_session(user_id="test-user")
            
            assert session_id is not None
            assert len(session_id) == 36  # UUID length
    
    @pytest.mark.asyncio
    async def test_add_message(self, chat_manager):
        """Test adding message to history."""
        with patch('chat_history.SupabaseClient') as mock_client:
            mock_instance = Mock()
            mock_instance.client = Mock()
            mock_instance.client.table = Mock()
            mock_instance.client.table.return_value.insert = Mock()
            
            message_data = {
                'session_id': 'test-session',
                'user_id': 'test-user',
                'query': 'test query',
                'response': 'test response',
            }
            
            mock_instance.client.table.return_value.insert.return_value.execute = AsyncMock(
                return_value=Mock(data=[{'id': 'test-id'}])
            )
            
            with mock_client:
                message_id = await chat_manager.add_message(**message_data)
                
                assert message_id == 'test-id'


# Integration tests (require actual API keys)
@pytest.mark.integration
class TestIntegration:
    """Integration tests that require real API access."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_rag_pipeline(self):
        """Test complete RAG pipeline with real APIs."""
        # This test requires:
        # - Valid OpenAI API key
        # - Valid Mistral API key
        # - Valid Supabase credentials
        # - Test data in Supabase
        
        if not all([
            os.getenv('OPENAI_API_KEY'),
            os.getenv('MISTRAL_API_KEY'),
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_KEY')
        ]):
            pytest.skip("Integration test requires API keys")
        
        pipeline = RAGPipeline()
        
        # Test health check
        assert await pipeline.check_health()
        
        # Test embedding generation
        embedding = await pipeline.generate_query_embedding("Test query")
        assert len(embedding) == 1536
        
        # Test full response generation
        collected = []
        async for token, citations, is_complete in pipeline.generate_response(
            "What is autism?", ChatMode.ACADEMIC, "test-session"
        ):
            collected.append(token)
            if is_complete:
                break
        
        assert len(collected) > 0
        assert any(len(token.strip()) > 0 for token in collected)