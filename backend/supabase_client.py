import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import logging
import asyncio

# Try to import supabase
from supabase.client import create_client, Client
from postgrest.exceptions import APIError

from schema import TextbookChunk
from config import settings
from logger import get_logger


class SupabaseClient:
    """Supabase client wrapper for Nelson-GPT RAG operations."""
    
    def __init__(self):
        self.logger = get_logger("supabase_client")
        self.client: Optional[Client] = None
        self._init_client()
    
    def _init_client(self):
        """Initialize Supabase client connection."""
        try:
            self.client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY
            )
            self.logger.info("Supabase client initialized successfully")
        except Exception as e:
            self.logger.error("Failed to initialize Supabase client", error=str(e))
            raise
    
    async def check_database_connection(self) -> bool:
        """Check if database connection is working."""
        try:
            # Use a simple query to check connection
            response = await asyncio.to_thread(
                self.client.table('nelson_textbook_chunks').select('count').limit(1).execute
            )
            self.logger.info("Database connection check successful")
            return True
        except Exception as e:
            self.logger.error("Database connection check failed", error=str(e))
            return False
    
    async def create_tables(self):
        """Create necessary tables for the RAG pipeline."""
        try:
            # Run DDL queries directly using PostgreSQL connector
            # Since we cannot use __init__, we'll execute SQL through the client
            self.logger.info("Creating database tables...")
            
            # Note: In production, use Supabase SQL editor or migrations
            # This is a placeholder for programmatic table creation
            self.logger.info("Tables should be created via Supabase SQL editor or migrations")
            self.logger.info("Template SQL provided in backend/README.md")
            
        except Exception as e:
            self.logger.error("Table creation error", error=str(e))
            raise
    
    async def insert_textbook_chunk(self, chunk: TextbookChunk) -> str:
        """Insert a textbook chunk into the database."""
        try:
            # Convert to dict
            chunk_dict = chunk.dict(exclude_none=True)
            if 'id' not in chunk_dict or not chunk_dict['id']:
                chunk_dict.pop('id', None)  # Let DB generate UUID
            
            # Insert into Supabase
            response = await asyncio.to_thread(
                self.client.table('nelson_textbook_chunks').insert(chunk_dict).execute()
            )
            
            if response.data and len(response.data) > 0:
                inserted_id = response.data[0]['id']
                self.logger.debug("Inserted textbook chunk", chunk_id=inserted_id)
                return inserted_id
            else:
                raise ValueError("Failed to insert chunk: no data returned")
                
        except APIError as e:
            self.logger.error("Supabase API error inserting chunk", error=str(e))
            raise
        except Exception as e:
            self.logger.error("Failed to insert textbook chunk", error=str(e))
            raise
    
    async def insert_textbook_chunks_batch(self, chunks: List[TextbookChunk]) -> List[str]:
        """Insert multiple textbook chunks in batch."""
        inserted_ids = []
        
        for i, chunk in enumerate(chunks):
            try:
                chunk_id = await self.insert_textbook_chunk(chunk)
                inserted_ids.append(chunk_id)
                
                if (i + 1) % 100 == 0:
                    self.logger.info(f"Inserted {i + 1} chunks", batch_size=len(chunks))
                    
            except Exception as e:
                self.logger.warning("Failed to insert chunk in batch", error=str(e), chunk_index=i)
        
        return inserted_ids
    
    async def search_similar_chunks(
        self, 
        query_embedding: List[float], 
        top_k: int = 5,
        category: Optional[str] = None,
        chapter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for chunks similar to the query embedding using pgvector.
        
        Args:
            query_embedding: Query vector embedding
            top_k: Number of results to return
            category: Optional category filter
            chapter: Optional chapter filter
            
        Returns:
            List of similar chunks with similarity scores
        """
        try:
            # Convert embedding to string for SQL
            embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
            
            # Build SQL query
            query = """
            SELECT 
                id,
                book_title,
                edition,
                chapter_section,
                content,
                summary,
                category,
                page_number,
                page_range,
                metadata,
                1 - (embedding <=> %s::vector) AS similarity_score
            FROM nelson_textbook_chunks
            WHERE 1=1
            """
            
            # Add filters if specified
            params = [embedding_str]
            param_count = 1
            
            if category:
                param_count += 1
                query += f" AND category = ${param_count}"
                params.append(category)
            
            if chapter:
                param_count += 1
                query += f" AND chapter_section ILIKE ${param_count}"
                params.append(f"%{chapter}%")
            
            # Order by similarity and limit results
            query += f" ORDER BY embedding <=> ${0}::vector LIMIT {top_k};"
            
            result = await asyncio.to_thread(
                self.client.rpc, 'exec_sql_with_params', {
                    'query': query,
                    'params': params
                }
            )
            
            if result.data:
                self.logger.debug(
                    "Retrieved similar chunks",
                    num_results=len(result.data),
                    avg_similarity=sum(r.get('similarity_score', 0) for r in result.data) / len(result.data)
                )
                return result.data
            else:
                return []
                
        except APIError as e:
            self.logger.error("Supabase API error during search", error=str(e))
            return []
        except Exception as e:
            self.logger.error("Error searching similar chunks", error=str(e))
            return []
    
    async def get_chunk_by_id(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific textbook chunk by ID."""
        try:
            response = await asyncio.to_thread(
                self.client.table('nelson_textbook_chunks')
                .select("*")
                .eq('id', chunk_id)
                .single()
                .execute()
            )
            
            return response.data if response.data else None
            
        except APIError as e:
            self.logger.error("Supabase API error retrieving chunk", error=str(e))
            return None
        except Exception as e:
            self.logger.error("Error retrieving chunk", error=str(e))
            return None
    
    async def update_chunk_metadata(self, chunk_id: str, metadata_updates: Dict[str, Any]) -> bool:
        """Update metadata for a specific chunk."""
        try:
            response = await asyncio.to_thread(
                self.client.table('nelson_textbook_chunks')
                .update({'metadata': metadata_updates})
                .eq('id', chunk_id)
                .execute()
            )
            
            return len(response.data or []) > 0
            
        except APIError as e:
            self.logger.error("Supabase API error updating chunk", error=str(e))
            return False
        except Exception as e:
            self.logger.error("Error updating chunk", error=str(e))
            return False
    
    async def enable_row_level_security(self):
        """Enable Row Level Security on tables."""
        try:
            # Enable RLS on chat_history and chat_sessions
            for table in ['chat_history', 'chat_sessions']:
                query = f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"
                await asyncio.to_thread(self.client.rpc, 'exec_sql', {'query': query})
            
            self.logger.info("Row Level Security enabled on tables")
        except Exception as e:
            self.logger.warning("Failed to enable RLS (may already be enabled)", error=str(e))