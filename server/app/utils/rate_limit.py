import time
from fastapi import Request, HTTPException, status
from typing import Dict, Tuple, List
from collections import defaultdict
import threading

class RateLimiter:
    """
    A simple memory-based rate limiter.
    In production, use Redis or a similar distributed store.
    """
    def __init__(self, requests: int, window: int):
        self.requests = requests
        self.window = window
        self.cache: Dict[str, List[float]] = defaultdict(list)
        self.lock = threading.Lock()

    def is_allowed(self, key: str) -> Tuple[bool, int]:
        """
        Check if the request is allowed for the given key.
        Returns (is_allowed, remaining_seconds).
        """
        now = time.time()
        with self.lock:
            # Filter out timestamps older than the window
            self.cache[key] = [t for t in self.cache[key] if now - t < self.window]
            
            if len(self.cache[key]) < self.requests:
                self.cache[key].append(now)
                return True, 0
            
            # Calculate wait time
            oldest_timestamp = self.cache[key][0]
            remaining = int(self.window - (now - oldest_timestamp))
            return False, remaining

# Instances for different levels of protection
# 10 requests per minute for auth/sensitive endpoints
auth_limiter = RateLimiter(requests=10, window=60)
# 100 requests per minute for general API
api_limiter = RateLimiter(requests=100, window=60)

async def rate_limit_auth(request: Request):
    client_ip = request.client.host
    allowed, retry_after = auth_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

async def rate_limit_api(request: Request):
    client_ip = request.client.host
    allowed, retry_after = api_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
