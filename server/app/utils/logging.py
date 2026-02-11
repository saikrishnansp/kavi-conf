import os
import sys
import logging
from loguru import logger
from app.core.config import get_settings


class InterceptHandler(logging.Handler):
    """
    Default handler from logging to loguru.
    See: https://loguru.readthedocs.io/en/stable/overview.html#entirely-compatible-with-standard-logging
    """

    def emit(self, record):
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = sys._getframe(6), 6
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        # logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())
        logger.opt(depth=depth).log(level, record.getMessage())


def setup_logging():
    settings = get_settings()

    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)

    # Remove default handlers
    logger.remove()

    # 1. Console logging (always visible)
    logger.add(
        sys.stdout,  # use stderr in production
        level=settings.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | {message}",
        colorize=True,
    )

    # 2. INFO (includes INFO, WARNING, ERROR, CRITICAL)
    logger.add(
        "logs/info.log",
        level="INFO",
        rotation="1 day",
        retention="7 days",
        compression="zip",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
        backtrace=False,
        diagnose=False,
    )

    # ... rest of the handlers ...
    # 3. WARNING only
    logger.add(
        "logs/warning.log",
        filter=lambda r: r["level"].name == "WARNING",
        rotation="1 week",
        retention="30 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
        backtrace=False,
        diagnose=False,
    )

    # 4. ERROR only
    logger.add(
        "logs/error.log",
        filter=lambda r: r["level"].name == "ERROR",
        rotation="1 week",
        retention="30 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message} | {exception}",
        backtrace=False,
        diagnose=False,
    )

    # 5. CRITICAL only
    logger.add(
        "logs/critical.log",
        filter=lambda r: r["level"].name == "CRITICAL",
        rotation="1 week",
        retention="30 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message} | {exception}",
        backtrace=False,
        diagnose=False,
    )

    # Intercept standard logging
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    # Optional: Silence uvicorn's default formatting so we don't get double logs
    for log_name in ["uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"]:
        logging_logger = logging.getLogger(log_name)
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.propagate = False


setup_logging()
