import asyncio
from datetime import date

from sqlalchemy.orm import Session, joinedload

from api.db.session import SessionLocal
from api.models.portfolio import Portfolio
from api.models.portfolio_snapshot import PortfolioSnapshot
from api.schemas.market_data import EnrichedMarketData
from api.services import market_data_service, portfolio_analyzer, ai_analyzer
from api.worker import celery_app


@celery_app.task(name="tasks.create_portfolio_snapshot")
def create_portfolio_snapshot(portfolio_id: int):
    """
    Calculates and saves a daily performance snapshot for a single portfolio.
    This task is responsible for fetching the portfolio data from the database.
    """
    db: Session = SessionLocal()
    try:
        portfolio: Portfolio | None = (
            db.query(Portfolio)
            .options(joinedload(Portfolio.transactions))
            .get(portfolio_id)
        )

        if not portfolio or not portfolio.transactions:
            return f"Portfolio {portfolio_id} not found or has no transactions. Skipping."

        holdings = portfolio_analyzer.calculate_holdings_from_transactions(
            portfolio.transactions
        )
        if not holdings:
            return f"Portfolio {portfolio_id} has no current holdings. Skipping."
        
        total_cost_basis = sum(h.total_cost_basis for h in holdings)
        
        symbols = [h.symbol for h in holdings]
        closing_prices = asyncio.run(market_data_service.get_current_prices(symbols))
        
        total_market_value = 0.0
        for holding in holdings:
            price = closing_prices.get(holding.symbol)
            if price:
                total_market_value += holding.quantity * price
        
        today = date.today()
        existing_snapshot = db.query(PortfolioSnapshot).filter_by(portfolio_id=portfolio_id, date=today).first()
        
        if existing_snapshot:
            existing_snapshot.total_market_value = total_market_value
            existing_snapshot.total_cost_basis = total_cost_basis
        else:
            new_snapshot = PortfolioSnapshot(
                date=today,
                total_market_value=total_market_value,
                total_cost_basis=total_cost_basis,
                portfolio_id=portfolio.id,
            )
            db.add(new_snapshot)
        
        db.commit()
        return f"Successfully created/updated snapshot for portfolio {portfolio_id}."
    
    except Exception as e:
        db.rollback()
        print(f"Error creating snapshot for portfolio {portfolio_id}: {e}")
        raise
    finally:
        db.close()


@celery_app.task(name="tasks.create_snapshots_for_all_portfolios")
def create_snapshots_for_all_portfolios():
    """
    Master task to trigger snapshot creation for all portfolios.
    This is the task that will be scheduled to run nightly.
    """
    db: Session = SessionLocal()
    try:
        portfolio_ids = db.query(Portfolio.id).all()
        
        for portfolio_id_tuple in portfolio_ids:
            create_portfolio_snapshot.delay(portfolio_id_tuple[0])
            
        return f"Dispatched snapshot tasks for {len(portfolio_ids)} portfolios."
    finally:
        db.close()


@celery_app.task(name="tasks.get_enriched_market_data_task")
def get_enriched_market_data_task(symbol: str, **kwargs):
    """
    Celery task to fetch enriched market data.
    """
    from api.services import market_data_aggregator
    
    try:
        period: str | None = kwargs.get("period")
        interval: str | None = kwargs.get("interval")
        print(f"DEBUG TASK: symbol={symbol!r}, period={period!r}, interval={interval!r}")
        data = asyncio.run(
            market_data_aggregator.get_enriched_market_data(
                symbol, period=period, interval=interval
            )
        )
        return data.model_dump(mode="json")
    except Exception as e:
        import traceback
        print(f"FULL ERROR: {traceback.format_exc()}")
        return {"error": str(e), "symbol": symbol}


@celery_app.task(name="tasks.run_deep_dive_analysis_task")
def run_deep_dive_analysis_task(enriched_data_dict: dict):
    """
    Celery task to run the AI deep-dive analysis.
    """
    try:
        enriched_data = EnrichedMarketData(**enriched_data_dict)
        content = asyncio.run(ai_analyzer.analyze_stock_deep_dive(enriched_data))
        return {"content": content}
    except Exception as e:
        return {"error": f"Failed during AI deep-dive analysis: {e}"}


@celery_app.task(name="tasks.run_trading_strategy_task")
def run_trading_strategy_task(enriched_data_dict: dict):
    """
    Celery task to generate an AI trading strategy.
    """
    try:
        enriched_data = EnrichedMarketData(**enriched_data_dict)
        strategy = asyncio.run(ai_analyzer.generate_trading_strategy(enriched_data))
        return strategy.model_dump(mode="json")
    except Exception as e:
        return {"error": f"Failed during AI strategy generation: {e}"}