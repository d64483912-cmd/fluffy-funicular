#!/usr/bin/env python3
"""
Import Nelson Textbook chunks into Supabase with embeddings.

This script loads textbook chunks from CSV files, generates embeddings using OpenAI,
and stores them in Supabase with pgvector support.
"""

import os
import sys
import asyncio
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional
import argparse
import logging
import signal
import math
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from schema import TextbookChunk
from config import Settings
from logger import setup_logging, get_logger

# Initialize settings
settings = Settings()
setup_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
logger = get_logger(__name__)


class NelsonTextbookImporter:
    """Importer for Nelson Textbook chunks with embeddings."""
    
    def __init__(self, csv_path: str = None, batch_size: int = 100):
        self.csv_path = csv_path or "./data/nelson_chunks.csv"
        self.batch_size = batch_size
        self.logger = get_logger("nelson_importer")
        
    async def load_csv_chunks(self) -> List[Dict[str, Any]]:
        """Load chunks from CSV file."""
        try:
            self.logger.info("Loading chunks from CSV", path=self.csv_path)
            
            df = pd.read_csv(self.csv_path)
            self.logger.info("Loaded CSV data", rows=len(df), columns=list(df.columns))
            
            # Validate required columns
            required_columns = ['content', 'chapter_section']
            for column in required_columns:
                if column not in df.columns:
                    raise ValueError(f"Missing required column: {column}")
            
            # Convert DataFrame to list of dicts
            chunks = df.to_dict('records')
            self.logger.info("Converted to chunks", count=len(chunks))
            
            return chunks
            
        except Exception as e:
            self.logger.error("Failed to load CSV", error=str(e))
            raise
    
    async def validate_chunks(self, chunks: List[Dict[str, Any]]) -> List[TextbookChunk]:
        """Validate and convert chunks to TextbookChunk schema."""
        validated_chunks = []
        
        for i, chunk_data in enumerate(chunks):
            try:
                # Create TextbookChunk with available data
                chunk = TextbookChunk(
                    book_title=chunk_data.get('book_title', 'Nelson Textbook of Pediatrics'),
                    edition=chunk_data.get('edition'),
                    chapter_section=chunk_data['chapter_section'],
                    content=chunk_data['content'],
                    summary=chunk_data.get('summary'),
                    category=chunk_data.get('category'),
                    page_number=int(chunk_data['page_number']) if chunk_data.get('page_number') else None,
                    page_range=chunk_data.get('page_range'),
                    metadata=chunk_data.get('metadata', {})
                )
                validated_chunks.append(chunk)
                
                if (i + 1) % 1000 == 0:
                    self.logger.debug("Validated chunks", count=i + 1)
                    
            except Exception as e:
                self.logger.warning("Failed to validate chunk", error=str(e), index=i)
        
        self.logger.info("Validation complete", valid_chunks=len(validiated_chunks), 
                       total_chunks=len(chunks))
        
        return validated_chunks
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI."""
        try:
            # Lazy import to only import when needed
            from langchain.embeddings.openai import OpenAIEmbeddings
            
            # Initialize embeddings model
            embeddings = OpenAIEmbeddings(
                model=settings.EMBEDDING_MODEL,
                openai_api_key=settings.OPENAI_API_KEY
            )
            
            # Generate embedding
            embedding = await asyncio.to_thread(embeddings.embed_query, text)
            
            # Validate dimensions
            if len(embedding) != settings.EMBEDDING_DIMENSIONS:
                self.logger.warning("Embedding dimension mismatch", 
                                  expected=settings.EMBEDDING_DIMENSIONS,
                                  actual=len(embedding))
            
            return embedding
            
        except Exception as e:
            self.logger.error("Failed to generate embedding", error=str(e), text_length=len(text))
            raise
    
    async def process_chunk_with_embedding(self, chunk: TextbookChunk) -> TextbookChunk:
        """Generate embedding for a single chunk."""
        try:
            # Use content for embedding (could also use summary if available)
            text_to_embed = chunk.content
            
            if chunk.summary:
                # Combine content and summary for better context
                text_to_embed = f"""{chunk.summary}

{chunk.content}"""
            
            # Generate embedding
            embedding = await self.generate_embedding(text_to_embed)
            
            # Update chunk with embedding
            chunk.embedding = embedding
            
            self.logger.debug("Processed chunk with embedding", 
                           chapter_section=chunk.chapter_section)
            
            return chunk
            
        except Exception as e:
            self.logger.error("Failed to process chunk", error=str(e), 
                           chapter_section=chunk.chapter_section)
            raise
    
    async def process_chunks_batch(self, chunks: List[TextbookChunk], 
                                 start_idx: int, 
                                 batch_size: int) -> List[TextbookChunk]:
        """Process a batch of chunks with embeddings."""
        processed_chunks = []
        
        # Use ThreadPoolExecutor for parallel processing
        with ThreadPoolExecutor(max_workers=settings.CONCURRENT_REQUESTS) as executor:
            loop = asyncio.get_event_loop()
            
            # Create tasks for each chunk
            tasks = []
            for i, chunk in enumerate(chunks):
                task = loop.run_in_executor(executor, self._process_single_chunk_sync, chunk)
                tasks.append(task)
            
            # Process batches to avoid overwhelming the API
            for i in range(0, len(tasks), 10):
                batch_tasks = tasks[i:i+10]
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                for j, result in enumerate(batch_results):
                    global_idx = start_idx + i + j
                    
                    if isinstance(result, Exception):
                        self.logger.error("Failed to process chunk in batch", 
                                        index=global_idx, error=str(result))
                    else:
                        processed_chunks.append(result)
                        
                # Small delay to respect rate limits
                await asyncio.sleep(0.1)
        
        return processed_chunks
    
    def _process_single_chunk_sync(self, chunk: TextbookChunk) -> TextbookChunk:
        """Synchronous wrapper for chunk processing (for threading)."""
        # This runs in a separate thread, so we need to handle the event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            processed_chunk = loop.run_until_complete(self.process_chunk_with_embedding(chunk))
            return processed_chunk
        finally:
            loop.close()
    
    async def store_chunks(self, chunks: List[TextbookChunk]) -> List[str]:
        """Store chunks with embeddings in Supabase."""
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            inserted_ids = []
            
            # Process in batches
            total_chunks = len(chunks)
            with tqdm(total=total_chunks, desc="Storing chunks") as pbar:
                for i in range(0, total_chunks, self.batch_size):
                    batch = chunks[i:i+self.batch_size]
                    batch_ids = await supabase_client.insert_textbook_chunks_batch(batch)
                    inserted_ids.extend(batch_ids)
                    
                    pbar.update(len(batch))
                    self.logger.info("Stored batch", 
                                  batch_start=i, 
                                  batch_end=min(i+self.batch_size, total_chunks),
                                  total_stored=len(inserted_ids))
            
            self.logger.info("All chunks stored successfully", total_chunks=len(inserted_ids))
            return inserted_ids
            
        except Exception as e:
            self.logger.error("Failed to store chunks", error=str(e))
            raise
    
    async def validate_embeddings(self, chunk_ids: List[str]) -> Dict[str, Any]:
        """Validate that embeddings were stored correctly."""
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            validation_stats = {
                'total_checked': 0,
                'with_embeddings': 0,
                'without_embeddings': 0,
                'average_similarity': 0.0
            }
            
            # Sample validation
            sample_size = min(50, len(chunk_ids))
            if sample_size == 0:
                return validation_stats
            
            sample_ids = chunk_ids[:sample_size]
            
            for chunk_id in sample_ids:
                try:
                    chunk = await supabase_client.get_chunk_by_id(chunk_id)
                    if chunk:
                        validation_stats['total_checked'] += 1
                        
                        if chunk.get('embedding'):
                            validation_stats['with_embeddings'] += 1
                            
                            # Verify embedding dimensions
                            embedding = chunk['embedding']
                            if len(embedding) != settings.EMBEDDING_DIMENSIONS:
                                self.logger.warning("Invalid embedding dimensions",
                                                  chunk_id=chunk_id,
                                                  dimensions=len(embedding))
                        else:
                            validation_stats['without_embeddings'] += 1
                
                except Exception as e:
                    self.logger.warning("Failed to validate chunk", chunk_id=chunk_id, error=str(e))
            
            self.logger.info("Embedding validation complete", stats=validation_stats)
            return validation_stats
            
        except Exception as e:
            self.logger.error("Failed to validate embeddings", error=str(e))
            return {}
    
    async def run_import(self) -> Dict[str, Any]:
        """Run the complete import pipeline."""
        try:
            self.logger.info("Starting Nelson Textbook chunks import")
            
            # 1. Load CSV chunks
            raw_chunks = await self.load_csv_chunks()
            
            # 2. Validate and convert to schema
            validated_chunks = await self.validate_chunks(raw_chunks)
            
            self.logger.info("Starting embedding generation", total_chunks=len(validated_chunks))
            
            # 3. Process chunks with embeddings in batches
            processed_chunks = []
            
            with tqdm(total=len(validated_chunks), desc="Generating embeddings") as pbar:
                for i in range(0, len(validated_chunks), self.batch_size):
                    batch = validated_chunks[i:i+self.batch_size]
                    batch_processed = await self.process_chunks_batch(batch, i, self.batch_size)
                    processed_chunks.extend(batch_processed)
                    pbar.update(len(batch))
                    
                    self.logger.info("Processed batch", 
                                  batch_num=i//self.batch_size + 1,
                                  total_processed=len(processed_chunks))
                    
                    # Small delay to avoid rate limits
                    await asyncio.sleep(0.5)
            
            # 4. Store chunks with embeddings
            self.logger.info("Storing chunks in Supabase", total_to_store=len(processed_chunks))
            chunk_ids = await self.store_chunks(processed_chunks)
            
            # 5. Validate embeddings
            self.logger.info("Validating stored embeddings")
            validation_stats = await self.validate_embeddings(chunk_ids)
            
            # Final stats
            stats = {
                'total_chunks': len(raw_chunks),
                'valid_chunks': len(validated_chunks),
                'processed_chunks': len(processed_chunks),
                'stored_chunks': len(chunk_ids),
                'validation_stats': validation_stats,
                'success_rate': len(chunk_ids) / len(raw_chunks) if raw_chunks else 0
            }
            
            self.logger.info("Import completed successfully", stats=stats)
            return stats
            
        except Exception as e:
            self.logger.error("Import failed", error=str(e))
            raise


async def main():
    """Main function to run the importer."""
    parser = argparse.ArgumentParser(description='Import Nelson Textbook chunks into Supabase')
    parser.add_argument('--csv', help='Path to CSV file with chunks')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size for processing')
    parser.add_argument('--test', action='store_true', help='Run a test on a small sample')
    
    args = parser.parse_args()
    
    # Validate environment
    required_env_vars = ['SUPABASE_URL', 'SUPABASE_KEY', 'OPENAI_API_KEY']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Error: Missing required environment variables: {missing_vars}")
        sys.exit(1)
    
    try:
        # Initialize importer
        importer = NelsonTextbookImporter(
            csv_path=args.csv,
            batch_size=args.batch_size
        )
        
        # Run import
        stats = await importer.run_import()
        
        # Print results
        print("\n" + "="*50)
        print("IMPORT COMPLETED")
        print("="*50)
        print(f"Total chunks: {stats['total_chunks']}")
        print(f"Valid chunks: {stats['valid_chunks']}")
        print(f"Processed chunks: {stats['processed_chunks']}")
        print(f"Stored chunks: {stats['stored_chunks']}")
        print(f"Success rate: {stats['success_rate']:.2%}")
        print("\nEmbedding validation:")
        print(f"  Checked: {stats['validation_stats'].get('total_checked', 0)}")
        print(f"  With embeddings: {stats['validation_stats'].get('with_embeddings', 0)}")
        print(f"  Without embeddings: {stats['validation_stats'].get('without_embeddings', 0)}")
        
        return 0
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        logger.error("Import failed", error=str(e))
        return 1


if __name__ == "__main__":
    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        print("\nImport interrupted by user")
        sys.exit(1)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # Run main
    exit_code = asyncio.run(main())
    sys.exit(exit_code)