import json
from typing import List

from api.schemas.holding import CalculatedHolding
from api.schemas.market_data import EnrichedMarketData
from api.schemas.ai import TradingStrategy
from api.services.openrouter_client import chat_completion, OpenRouterError

strategy_prompt_en = open("api/prompts/strategy_en.txt", "r").read()
strategy_prompt_he = open("api/prompts/strategy_he.txt", "r").read()
analysis_prompt_en = open("api/prompts/analysis_en.txt", "r").read()
analysis_prompt_he = open("api/prompts/analysis_he.txt", "r").read()


def format_holdings_for_prompt(holdings: List[CalculatedHolding]) -> str:
    """Formats a list of calculated holding objects into a string for the AI prompt."""
    if not holdings:
        return "The portfolio is empty."

    formatted_holdings = "\n".join(
        [
            f"- {h.quantity:.4f} shares of {h.symbol} with an average cost basis of "
            f"${h.average_cost_basis:.2f} per share."
            for h in holdings
        ]
    )
    return formatted_holdings


def format_stock_data_for_prompt(data: EnrichedMarketData) -> str:
    """Formats an EnrichedMarketData object into a string for the AI prompt."""
    f = data.fundamentals
    t = data.technicals
    ti = data.trading_info

    trading_status_parts = [f"Market is {ti.market_state}."]
    if ti.market_state == "REGULAR":
        if ti.regular_market_change_percent is not None:
            change_str = f"{ti.regular_market_change_percent * 100:+.2f}%"
            trading_status_parts.append(f"Today's Change: {change_str}")
    elif ti.market_state == "PRE":
        if ti.pre_market_price is not None and ti.pre_market_change_percent is not None:
            change_str = f"{ti.pre_market_change_percent * 100:+.2f}%"
            trading_status_parts.append(
                f"Pre-Market: ${ti.pre_market_price:.2f} ({change_str})"
            )
    elif ti.market_state == "POST":
        if ti.post_market_price is not None and ti.post_market_change_percent is not None:
            change_str = f"{ti.post_market_change_percent * 100:+.2f}%"
            trading_status_parts.append(
                f"Post-Market: ${ti.post_market_price:.2f} ({change_str})"
            )
    trading_status_str = " ".join(trading_status_parts)

    valuation_list: list[str] = []
    if f.pe_ratio:
        valuation_list.append(f"- P/E Ratio (TTM): {f.pe_ratio:.2f}")
    if f.forward_pe_ratio:
        valuation_list.append(f"- Forward P/E Ratio: {f.forward_pe_ratio:.2f}")
    if f.price_to_book_ratio:
        valuation_list.append(f"- Price-to-Book Ratio: {f.price_to_book_ratio:.2f}")
    if f.price_to_sales_ratio:
        valuation_list.append(
            f"- Price-to-Sales Ratio (TTM): {f.price_to_sales_ratio:.2f}"
        )

    financials_list: list[str] = []
    if f.market_cap:
        financials_list.append(f"- Market Cap: ${f.market_cap:,}")
    if f.earnings_date:
        financials_list.append(f"- Next Earnings: {f.earnings_date.strftime('%Y-%m-%d')}")
    if f.profit_margins:
        financials_list.append(f"- Profit Margin: {f.profit_margins*100:.2f}%")
    if f.return_on_equity:
        financials_list.append(f"- Return on Equity: {f.return_on_equity*100:.2f}%")

    analyst_list: list[str] = []
    if f.analyst_recommendation:
        analyst_list.append(f"- Consensus: {f.analyst_recommendation.upper()}")
    if f.analyst_target_price:
        analyst_list.append(f"- Target Price: ${f.analyst_target_price:.2f}")
    if f.number_of_analyst_opinions:
        analyst_list.append(f"- # of Analysts: {f.number_of_analyst_opinions}")

    technicals_list: list[str] = []
    if t.sma_50 and t.sma_200:
        trend = "Uptrend" if t.sma_50 > t.sma_200 else "Downtrend"
        technicals_list.append(f"- 50-Day vs 200-Day SMA: {trend}")
    if f.week_52_high and f.week_52_low:
        technicals_list.append(
            f"- 52-Week Range: ${f.week_52_low:.2f} - ${f.week_52_high:.2f}"
        )
    if t.rsi_14:
        rsi_condition = (
            "Overbought" if t.rsi_14 > 70 else "Oversold" if t.rsi_14 < 30 else "Neutral"
        )
        technicals_list.append(f"- RSI (14): {t.rsi_14:.2f} ({rsi_condition})")

    news_str = (
        "\n".join([f"- {n.title} ({n.publisher})" for n in data.news[:5]])
        if data.news
        else "N/A"
    )

    # Pre-computed sections to avoid backslashes in f-string expressions
    valuation_str = "\n".join(valuation_list) if valuation_list else "N/A"
    financials_str = "\n".join(financials_list) if financials_list else "N/A"
    analyst_str = "\n".join(analyst_list) if analyst_list else "N/A"
    technicals_str = "\n".join(technicals_list) if technicals_list else "N/A"

    prompt_data = f"""
Company: {data.short_name} ({data.symbol})
Current Price: ${data.current_price:.2f}
{trading_status_str}
Description: {f.description}

--- Valuation ---
{valuation_str}

--- Financials & Outlook ---
{financials_str}

--- Analyst Ratings ---
{analyst_str}

--- Technicals ---
{technicals_str}

--- News ---
{news_str}
"""
    return prompt_data.strip()


async def analyze_portfolio(holdings: List[CalculatedHolding]) -> str:
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

    try:
        response = await chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            timeout=30.0,
        )
        return response["choices"][0]["message"]["content"]
    except OpenRouterError as e:
        # Return a user-friendly error message
        return f"AI analysis could not be completed at this time. Details: {e}"
    except (KeyError, IndexError, TypeError):
        # Handle cases where the response structure is not as expected
        return "Received an unexpected response from the AI service."


async def analyze_stock_deep_dive(
    data: EnrichedMarketData, language: str = "English"
) -> str:
    """
    Performs a deep-dive analysis on a stock using its enriched data.
    """
    formatted_data = format_stock_data_for_prompt(data)

    if language == "English":
        system_prompt = analysis_prompt_en
    else:
        system_prompt = analysis_prompt_he

    user_prompt = f"Please provide a deep-dive analysis in {language.upper()} for the following stock based on this data:\n\n{formatted_data}"

    try:
        response = await chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            timeout=60.0,
        )
        return response["choices"][0]["message"]["content"]
    except OpenRouterError as e:
        raise ConnectionError(str(e)) from e
    except (KeyError, IndexError) as e:
        return f"Received an unexpected response from the AI service: {e}"


async def generate_trading_strategy(
    data: EnrichedMarketData, language: str = "English"
) -> TradingStrategy:
    """
    Generates an actionable trading strategy using an AI model.
    """
    formatted_data = format_stock_data_for_prompt(data)
    
    if language == "English":
        system_prompt = strategy_prompt_en
    else:
        system_prompt = strategy_prompt_he

    user_prompt = f"Generate a trading strategy in {language.upper()} for the following stock data:\n\n{formatted_data}"

    try:
        response = await chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            timeout=45.0,
            extra_params={"response_format": {"type": "json_object"}},
        )

        strategy_json_str = response["choices"][0]["message"]["content"]
        strategy_data = json.loads(strategy_json_str)
        return TradingStrategy(**strategy_data)
    except OpenRouterError as e:
        raise ConnectionError(str(e)) from e