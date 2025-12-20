import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import uuid
from dataclasses import asdict

from schema import ChatMessage, ChatSession, Citation, Source, ChatMode, AiStyle
from logger import get_logger


class ChatHistoryManager:
    """Manages chat history persistence and retrieval."""
    
    def __init__(self):
        self.logger = get_logger("chat_history_manager")
    
    async def create_session(self, 
                           user_id: Optional[str] = None, 
                           metadata: Dict[str, Any] = None) -> str:
        """
        Create a new chat session.
        
        Args:
            user_id: Optional user identifier
            metadata: Optional session metadata
            
        Returns:
            str: Session ID
        """
        session_id = str(uuid.uuid4())
        
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            # Create session data
            session_data = {
                'session_id': session_id,
                'user_id': user_id,
                'title': 'New Conversation',
                'message_count': 0,
                'metadata': metadata or {},
            }
            
            # Insert into database
            await asyncio.to_thread(
                supabase_client.client.table('chat_sessions').insert(session_data).execute
            )
            
            self.logger.info("Created new chat session", session_id=session_id, user_id=user_id)
            return session_id
            
        except Exception as e:
            self.logger.error("Failed to create chat session", error=str(e))
            raise
    
    async def get_session(self, session_id: str, user_id: Optional[str] = None) -> Optional[ChatSession]:
        """
        Get session metadata.
        
        Args:
            session_id: Session identifier
            user_id: Optional user identifier for validation
            
        Returns:
            Optional[ChatSession]: Session data or None
        """
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            # Build query
            query = supabase_client.client.table('chat_sessions').select('*').eq('session_id', session_id)
            
            if user_id:
                query = query.eq('user_id', user_id)
            
            response = await asyncio.to_thread(query.single().execute)
            
            if response.data:
                return ChatSession(**response.data)
            else:
                return None
                
        except Exception as e:
            self.logger.warning("Failed to get session", error=str(e), session_id=session_id)
            return None
    
    async def update_session_title(self, 
                               session_id: str, 
                               title: str, 
                               user_id: Optional[str] = None) -> None:
        """
        Update session title.
        
        Args:
            session_id: Session identifier
            title: New title
            user_id: Optional user identifier for validation
        """
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            # Update session
            update_data = {
                'title': title,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            query = supabase_client.client.table('chat_sessions').update(update_data).eq('session_id', session_id)
            
            if user_id:
                query = query.eq('user_id', user_id)
            
            await asyncio.to_thread(query.execute)
            
            self.logger.info("Updated session title", session_id=session_id, title=title)
            
        except Exception as e:
            self.logger.error("Failed to update session title", error=str(e), session_id=session_id)
            raise
    
    async def pin_session(self, 
                        session_id: str, 
                        is_pinned: bool = True, 
                        user_id: Optional[str] = None) -> None:
        """
        Pin or unpin a session.
        
        Args:
            session_id: Session identifier
            is_pinned: True to pin, False to unpin
            user_id: Optional user identifier for validation
        """
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            update_data = {
                'is_pinned': is_pinned,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            query = supabase_client.client.table('chat_sessions').update(update_data).eq('session_id', session_id)
            
            if user_id:
                query = query.eq('user_id', user_id)
            
            await asyncio.to_thread(query.execute)
            
            self.logger.info("Updated session pin status", 
                          session_id=session_id, is_pinned=is_pinned)
            
        except Exception as e:
            self.logger.error("Failed to pin session", error=str(e), session_id=session_id)
            raise
    
    async def add_message(self,
                         session_id: str,
                         user_id: Optional[str],
                         query: str,
                         response: str = "",
                         mode: ChatMode = ChatMode.ACADEMIC,
                         ai_style: AiStyle = AiStyle.BALANCED,
                         citations: List[Citation] = None,
                         sources: List[Source] = None,
                         metadata: Dict[str, Any] = None,
                         tokens_used: int = 0) -> str:
        """
        Add a message to chat history.
        
        Args:
            session_id: Session identifier
            user_id: Optional user identifier
            query: User's query
            response: AI response
            mode: Chat mode
            ai_style: AI response style
            citations: List of citations
            sources: List of sources
            metadata: Additional metadata
            tokens_used: Number of tokens used
            
        Returns:
            str: Message ID
        """
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            # Prepare message data
            message_data = {
                'session_id': session_id,
                'user_id': user_id,
                'query': query,
                'response': response,
                'mode': mode.value,
                'ai_style': ai_style.value,
                'citations': [citation.dict() for citation in (citations or [])],
                'sources': [source.dict() for source in (sources or [])],
                'tokens_used': tokens_used,
                'metadata': metadata or {},
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Insert into database
            response = await asyncio.to_thread(
                supabase_client.client.table('chat_history').insert(message_data).execute
            )
            
            # Update session message count and timestamp
            await self._update_session_stats(session_id)
            
            self.logger.debug("Added message to chat history", session_id=session_id)
            
            return response.data[0]['id'] if response.data else None
            
        except Exception as e:
            self.logger.error("Failed to add message", error=str(e), session_id=session_id)
            raise
    
    async def get_session_history(self, 
                                session_id: str, 
                                limit: Optional[int] = None,
                                offset: int = 0) -> List[ChatMessage]:
        """
        Get chat history for a session.
        
        Args:
            session_id: Session identifier
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            List[ChatMessage]: Chat history in chronological order
        """
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            # Prepare query
            query = supabase_client.client.table('chat_history')\
                .select('*')\
                .eq('session_id', session_id)\
                .order('timestamp')
            
            if limit:
                query = query.range(offset, offset + limit - 1)
            
            # Execute query
            response = await asyncio.to_thread(query.execute)
            
            # Convert to ChatMessage objects
            messages = []
            for data in (response.data or []):
                message = ChatMessage(
                    role=data.get('role', 'assistant'),
                    content=data.get('response', ''),
                    citations=[Citation(**c) for c in data.get('citations', [])],
                    sources=[Source(**s) for s in data.get('sources', [])],
                    timestamp=datetime.fromisoformat(data['timestamp'])
                )
                messages.append(message)
            
            self.logger.debug("Retrieved chat history", 
                            session_id=session_id, message_count=len(messages))
            
            return messages
            
        except Exception as e:
            self.logger.error("Failed to get chat history", error=str(e), session_id=session_id)
            return []
    
    async def get_user_sessions(self, 
                              user_id: str, 
                              limit: int = 20,
                              include_archived: bool = False) -> List[ChatSession]:
        """
        Get all sessions for a user.
        
        Args:
            user_id: User identifier
            limit: Maximum number of sessions to return (None for all)
            include_archived: Whether to include archived sessions
            
        Returns:
            List[ChatSession]: User sessions sorted by last updated
        """
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            # Prepare query
            query = supabase_client.client.table('chat_sessions')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('updated_at', desc=True)
            
            if not include_archived:
                query = query.eq('is_archived', False)
            
            if limit:
                query = query.limit(limit)
            
            # Execute query
            response = await asyncio.to_thread(query.execute)
            
            # Convert to ChatSession objects
            sessions = []
            for data in (response.data or []):
                session = ChatSession(**data)
                sessions.append(session)
            
            self.logger.info("Retrieved user sessions", 
                          user_id=user_id, session_count=len(sessions))
            
            return sessions
            
        except Exception as e:
            self.logger.error("Failed to get user sessions", error=str(e), user_id=user_id)
            return []
    
    async def search_history(self, 
                           query: str, 
                           user_id: str = None,
                           limit: int = 10) -> List[ChatMessage]:
        """
        Search chat history for specific query.
        
        Args:
            query: Search query
            user_id: Optional user identifier to filter
            limit: Maximum results to return
            
        Returns:
            List[ChatMessage]: Matching messages
        """
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            # Build search query
            search_query = supabase_client.client.table('chat_history')\
                .select('*')\
                .or_('query.ilike.%{}%,response.ilike.%{}%'.format(query, query))
            
            if user_id:
                search_query = search_query.eq('user_id', user_id)
            
            if limit:
                search_query = search_query.limit(limit)
            
            # Execute search
            response = await asyncio.to_thread(search_query.execute)
            
            # Convert results
            messages = []
            for data in (response.data or []):
                message = ChatMessage(
                    role='assistant',
                    content=data.get('response', ''),
                    citations=[Citation(**c) for c in data.get('citations', [])],
                    sources=[Source(**s) for s in data.get('sources', [])],
                    timestamp=datetime.fromisoformat(data['timestamp'])
                )
                messages.append(message)
            
            self.logger.info("Search completed", 
                          query=query, result_count=len(messages))
            
            return messages
            
        except Exception as e:
            self.logger.error("Failed to search history", error=str(e), query=query)
            return []
    
    async def _update_session_stats(self, session_id: str) -> None:
        """Update session statistics (message count and timestamp)."""
        try:
            from supabase_client import SupabaseClient
            supabase_client = SupabaseClient()
            
            # Update message count and timestamp using raw SQL
            update_query = """
            UPDATE chat_sessions 
            SET 
                message_count = (SELECT COUNT(*) FROM chat_history WHERE session_id = %s),
                updated_at = NOW()
            WHERE session_id = %s;
            """
            
            # Use Supabase rpc if available, otherwise use table update
            await asyncio.to_thread(
                supabase_client.client.rpc, 'increase_message_count', {
                    'session_id': session_id
                }
            )
            
        except Exception as e:
            # Don't fail if stats update fails
            self.logger.warning("Failed to update session stats", 
                            error=str(e), session_id=session_id)