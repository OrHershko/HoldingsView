import pytest
from unittest.mock import AsyncMock
import httpx

from api.services.openrouter_client import chat_completion, OpenRouterError
from api.core.config import settings


@pytest.mark.asyncio
async def test_chat_completion_success(mocker):
    """chat_completion returns parsed data on success."""
    expected_content = "Hello!"
    mock_json = {"choices": [{"message": {"content": expected_content}}]}

    mock_response = AsyncMock()
    mock_response.json = AsyncMock(return_value=mock_json)
    mock_response.raise_for_status = AsyncMock()

    mocker.patch("httpx.AsyncClient.post", return_value=mock_response)

    result = await chat_completion(messages=[{"role": "user", "content": "Hi"}])

    assert result == mock_json


@pytest.mark.asyncio
async def test_chat_completion_missing_api_key(mocker):
    """chat_completion raises OpenRouterError when API key is absent."""
    mocker.patch.object(settings, "OPENROUTER_API_KEY", None)

    with pytest.raises(OpenRouterError):
        await chat_completion(messages=[{"role": "user", "content": "Hi"}])


@pytest.mark.asyncio
async def test_chat_completion_retries_then_success(mocker):
    """chat_completion retries on request error and succeeds on second attempt."""
    expected_json = {"choices": [{"message": {"content": "Ok"}}]}

    # First call raises a RequestError, second returns success
    error_side_effect = httpx.RequestError("Network error", request=None)
    success_response = AsyncMock()
    success_response.json = AsyncMock(return_value=expected_json)
    success_response.raise_for_status = AsyncMock()

    mocker.patch(
        "httpx.AsyncClient.post",
        side_effect=[error_side_effect, success_response],
    )

    result = await chat_completion(messages=[{"role": "user", "content": "Hi"}], retries=1, backoff_factor=0)

    assert result == expected_json 