import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Settings
    API_HOST: str = Field(default="0.0.0.0", env="API_HOST")
    API_PORT: int = Field(default=8000, env="API_PORT")
    DEBUG: bool = Field(default=False, env="DEBUG")
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
        env="ALLOWED_ORIGINS"
    )
    
    # Supabase Settings
    SUPABASE_URL: str = Field(env="SUPABASE_URL")
    SUPABASE_KEY: str = Field(env="SUPABASE_KEY")
    SUPABASE_SERVICE_KEY: Optional[str] = Field(default=None, env="SUPABASE_SERVICE_KEY")
    
    # Third-party API Keys
    OPENAI_API_KEY: str = Field(env="OPENAI_API_KEY")
    MISTRAL_API_KEY: str = Field(env="MISTRAL_API_KEY")
    
    # Model Settings
    EMBEDDING_MODEL: str = Field(default="text-embedding-3-small", env="EMBEDDING_MODEL")
    CHAT_MODEL: str = Field(default="mistral-large", env="CHAT_MODEL")
    EMBEDDING_DIMENSIONS: int = Field(default=1536, env="EMBEDDING_DIMENSIONS")
    
    # RAG Settings
    TOP_K_RESULTS: int = Field(default=5, env="TOP_K_RESULTS")
    MAX_CONTEXT_TOKENS: int = Field(default=4000, env="MAX_CONTEXT_TOKENS")
    CHUNK_OVERLAP: int = Field(default=200, env="CHUNK_OVERLAP")
    
    # Vector Search Settings
    VECTOR_SEARCH_METRIC: str = Field(default="cosine", env="VECTOR_SEARCH_METRIC")
    VECTOR_SEARCH_PROBES: int = Field(default=10, env="VECTOR_SEARCH_PROBES")
    
    # Mistral Settings
    MISTRAL_MAX_TOKENS: int = Field(default=4096, env="MISTRAL_MAX_TOKENS")
    MISTRAL_TEMPERATURE: float = Field(default=0.3, env="MISTRAL_TEMPERATURE")
    MISTRAL_TOP_P: float = Field(default=0.95, env="MISTRAL_TOP_P")
    
    # Performance Settings
    CONCURRENT_REQUESTS: int = Field(default=3, env="CONCURRENT_REQUESTS")
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60, env="RATE_LIMIT_REQUESTS_PER_MINUTE")
    
    # Cache Settings
    CACHE_ENABLED: bool = Field(default=True, env="CACHE_ENABLED")
    CACHE_TTL_SECONDS: int = Field(default=3600, env="CACHE_TTL_SECONDS")
    
    # Logging Settings
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="json", env="LOG_FORMAT")
    
    # File paths
    DATA_DIR: str = Field(default="./data", env="DATA_DIR")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()