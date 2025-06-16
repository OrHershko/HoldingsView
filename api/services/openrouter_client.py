from typing import List, Dict, Any, Optional

import httpx
import asyncio
import random

from api.core.config import settings


class OpenRouterError(Exception):
    """Custom exception for OpenRouter-related errors."""


async def chat_completion(
    *,
    messages: List[Dict[str, str]],
    model: str = "deepseek/deepseek-r1-0528:free",
    timeout: float = 30.0,
    extra_params: Optional[Dict[str, Any]] = None,
    retries: int = 3,
    backoff_factor: float = 0.5,
) -> Dict[str, Any]:
    """Send a chat completion request to the OpenRouter API.

    Args:
        messages: A list of message dicts adhering to the OpenAI chat format.
        model: Which model to query. Defaults to the free DeepSeek model.
        timeout: HTTP request timeout in seconds.
        extra_params: Additional key/value pairs to merge into the JSON payload.
        retries: Number of retry attempts.
        backoff_factor: Factor to calculate exponential backoff between retries.

    Returns:
        The parsed JSON response from OpenRouter.

    Raises:
        OpenRouterError: For configuration issues or unexpected response formats.
        httpx.RequestError / httpx.HTTPStatusError: For network-level errors.
    """

    if not settings.OPENROUTER_API_KEY:
        raise OpenRouterError("AI analysis is not configured. Missing OPENROUTER_API_KEY.")

    payload: Dict[str, Any] = {"model": model, "messages": messages}
    if extra_params:
        payload.update(extra_params)

    async def _post_once() -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()

            data_or_coro_inner = response.json()
            if hasattr(data_or_coro_inner, "__await__"):
                return await data_or_coro_inner 
            return data_or_coro_inner

    attempt = 0
    last_error: Optional[Exception] = None
    while attempt <= retries:
        try:
            data = await _post_once()
            break  # Success
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            # Retry on 429 (rate limit) or 5xx server errors
            if status == 429 or 500 <= status < 600:
                last_error = exc
            else:
                # Non-retryable HTTP errors (e.g., 4xx other than 429)
                raise OpenRouterError(
                    f"OpenRouter API responded with status {status}: {exc.response.text}"
                ) from exc
        except httpx.RequestError as exc:
            # Transient network errors – eligible for retry
            last_error = exc
        # If here, a retry-able error occurred
        attempt += 1
        if attempt > retries:
            # Exhausted retries – wrap and raise a clean error
            raise OpenRouterError(
                f"An error occurred while contacting the AI service: {last_error}"
            ) from last_error
        # Exponential backoff with jitter
        sleep_for = backoff_factor * 2 ** (attempt - 1)
        sleep_for += random.uniform(0, backoff_factor)
        await asyncio.sleep(sleep_for)

    # Basic validation
    if "choices" not in data or not data["choices"]:
        raise OpenRouterError("Malformed response received from OpenRouter.")

    return data 