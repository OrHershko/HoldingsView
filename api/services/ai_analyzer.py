from typing import List

import httpx

from api.core.config import settings
from api.models.holding import Holding


def format_holdings_for_prompt(holdings: List[Holding]) -> str:
    """Formats a list of holding objects into a string for the AI prompt."""
    if not holdings:
        return "The portfolio is empty."

    formatted_holdings = "\n".join(
        [
            f"- {h.quantity} shares of {h.symbol} purchased at ${h.purchase_price:.2f} on {h.purchase_date.strftime('%Y-%m-%d')}"
            for h in holdings
        ]
    )
    return formatted_holdings


async def analyze_portfolio(holdings: List[Holding]) -> str:
    """
    Analyzes a portfolio's holdings using an external AI model via OpenRouter.
    """
    holdings_str = format_holdings_for_prompt(holdings)

    system_prompt = (
        "You are a helpful financial analyst. You will be given a list of stock "
        "holdings in a portfolio. Provide a brief, high-level analysis of the "
        "portfolio's composition. Focus on diversification across sectors, risk "
        "profile (e.g., is it aggressive, conservative, growth-focused?), and "
        "mention any potential concentrations. Do not give financial advice, "
        "buy/sell recommendations, or predict future performance. The analysis "
        "should be a single paragraph."
    )

    user_prompt = f"Here are the portfolio holdings:\n{holdings_str}"

    if not settings.OPENROUTER_API_KEY:
        return "AI analysis is not configured. Missing OPENROUTER_API_KEY."

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                },
                json={
                    "model": "openai/gpt-3.5-turbo",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
                timeout=30.0,  # Set a timeout for the external request
            )
            response.raise_for_status()  # Raise an exception for 4xx or 5xx status

            data = await response.json()

            return data["choices"][0]["message"]["content"]
        except httpx.RequestError as e:
            # Handle network-related errors
            return f"An error occurred while contacting the AI service: {e}"
        except (KeyError, IndexError) as e:
            # Handle unexpected response structure
            return f"Received an unexpected response from the AI service: {e}"