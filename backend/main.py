import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import logging
import structlog
from dataclasses import dataclass
from datetime import datetime
import json

from rag_pipeline import RAGPipeline
from supabase_client import SupabaseClient
from chat_history import ChatHistoryManager
from schema import ChatRequest, ChatResponse, Citation, Source
from config import Settings
from logger import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for FastAPI application."""
    # Startup
    app.state.logger.info("Starting Nelson-GPT RAG backend")
    
    # Initialize RAG pipeline
    rag_pipeline = RAGPipeline()
    app.state.rag_pipeline = rag_pipeline
    
    # Initialize chat history manager
    chat_history_manager = ChatHistoryManager()
    app.state.chat_history_manager = chat_history_manager
    
    # Initialize Supabase client
    supabase_client = SupabaseClient()
    app.state.supabase_client = supabase_client
    
    app.state.logger.info("Nelson-GPT RAG backend started successfully")
    
    yield
    
    # Shutdown
    app.state.logger.info("Shutting down Nelson-GPT RAG backend")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    # Setup structured logging
    setup_logging()
    
    settings = Settings()
    
    app = FastAPI(
        title="Nelson-GPT RAG API",
        description="Retrieval-Augmented Generation API for pediatric knowledge assistant",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Store logger in app state
    app.state.logger = structlog.get_logger()
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add request ID middleware
    @app.middleware("http")
    async def add_request_id_header(request: Request, call_next):
        import uuid
        request_id = str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    
    return app


app = create_app()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "nelson-gpt-rag"
    }


@app.get("/api/ready")
async def readiness_check():
    """Readiness check endpoint."""
    try:
        # Check RAG pipeline components
        await app.state.rag_pipeline.check_health()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")


async def generate_stream_response(query: str, mode: str, session_id: str):
    """Generate streaming response from RAG pipeline."""
    async for token, citations, is_complete in app.state.rag_pipeline.generate_response(
        query, mode, session_id
    ):
        data = {
            "token": token,
            "citations": [citation.dict() for citation in citations] if citations else [],
            "is_complete": is_complete
        }
        yield f"data: {json.dumps(data)}\n\n"
    
    # Final completion marker
    yield "data: [DONE]\n\n"


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: Request, chat_data: ChatRequest):
    """Main chat endpoint that processes queries and returns streaming responses."""
    logger = structlog.get_logger()
    logger = logger.bind(session_id=chat_data.session_id, mode=chat_data.mode)
    
    try:
        logger.info("Received chat request", query_length=len(chat_data.query))
        
        # Validate mode
        if chat_data.mode not in ["academic", "clinical"]:
            raise HTTPException(status_code=400, detail="Invalid mode. Must be 'academic' or 'clinical'")
        
        # Sanitize query
        sanitized_query = " ".join(chat_data.query.strip().split())
        if not sanitized_query:
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Store the query in chat history
        await app.state.chat_history_manager.add_message(
            session_id=chat_data.session_id,
            user_id=chat_data.user_id,
            query=sanitized_query,
            mode=chat_data.mode,
            ai_style=chat_data.ai_style
        )
        
        # Return streaming response
        return StreamingResponse(
            generate_stream_response(
                sanitized_query,
                chat_data.mode,
                chat_data.session_id
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Chat endpoint error", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str, user_id: str = None):
    """Get chat history for a session."""
    logger = structlog.get_logger()
    logger = logger.bind(session_id=session_id)
    
    try:
        history = await app.state.chat_history_manager.get_session_history(
            session_id, user_id
        )
        return {"session_id": session_id, "history": history}
    except Exception as e:
        logger.error("Error retrieving chat history", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error retrieving history: {str(e)}")


@app.post("/api/chat/sessions")
async def create_chat_session(user_id: str = None, metadata: dict = None):
    """Create a new chat session."""
    logger = structlog.get_logger()
    
    try:
        session_id = await app.state.chat_history_manager.create_session(
            user_id, metadata or {}
        )
        logger.info("Created new chat session", session_id=session_id)
        return {"session_id": session_id}
    except Exception as e:
        logger.error("Error creating chat session", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error creating session: {str(e)}")


@app.put("/api/chat/sessions/{session_id}/title")
async def update_session_title(session_id: str, title: str, user_id: str = None):
    """Update the title of a chat session."""
    logger = structlog.get_logger()
    logger = logger.bind(session_id=session_id)
    
    try:
        await app.state.chat_history_manager.update_session_title(
            session_id, title, user_id
        )
        logger.info("Updated session title")
        return {"success": True}
    except Exception as e:
        logger.error("Error updating session title", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error updating title: {str(e)}")


if __name__ == "__main__":
    settings = Settings()
    
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level="info",
        access_log=True
    )