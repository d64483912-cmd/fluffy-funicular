import logging
import structlog
import sys
from typing import Any, Dict
from pythonjsonlogger import jsonlogger


def setup_logging(level: str = "INFO", format: str = "json") -> None:
    """
    Setup structured logging using structlog and python-json-logger.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format: Output format ('json' or 'console')
    """
    # Configure standard logging to redirect to structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level.upper()),
        force=True
    )
    
    # Configure structlog
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    if format == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())
    
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Get logger
    logger = structlog.get_logger()
    logger.info("Logging configuration complete", level=level, format=format)


def get_logger(name: str = None) -> structlog.BoundLogger:
    """Get a configured logger instance."""
    if name:
        return structlog.get_logger(name)
    return structlog.get_logger()


def log_api_request(logger: structlog.BoundLogger, request: Any, **kwargs) -> None:
    """Log API request details."""
    logger.info(
        "API request received",
        method=request.method,
        path=request.url.path,
        query_params=dict(request.query_params),
        **kwargs
    )


def log_api_response(logger: structlog.BoundLogger, status_code: int, duration: float, **kwargs) -> None:
    """Log API response details."""
    logger.info(
        "API response sent",
        status_code=status_code,
        duration_ms=round(duration * 1000, 2),
        **kwargs
    )


def log_rag_pipeline(logger: structlog.BoundLogger, query: str, mode: str, **kwargs) -> None:
    """Log RAG pipeline execution details."""
    logger.info(
        "RAG pipeline execution started",
        query_length=len(query),
        mode=mode,
        **kwargs
    )


def log_retrieval_results(logger: structlog.BoundLogger, num_results: int, avg_relevance: float, **kwargs) -> None:
    """Log retrieval results."""
    logger.info(
        "Retrieval completed",
        num_results=num_results,
        avg_relevance=round(avg_relevance, 3),
        **kwargs
    )


def log_generation_completed(logger: structlog.BoundLogger, tokens_used: int, response_length: int, **kwargs) -> None:
    """Log generation completion."""
    logger.info(
        "Response generation completed",
        tokens_used=tokens_used,
        response_length=response_length,
        **kwargs
    )