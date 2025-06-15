from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.crud import crud_portfolio, crud_holding
from api.auth.firebase import get_current_user, get_db
from api.models.user import User
from api.schemas.portfolio import PortfolioCreate, PortfolioRead, PortfolioUpdate, PortfolioReadWithHoldings
from api.schemas.holding import HoldingCreate, HoldingRead, HoldingUpdate
from api.schemas.ai import AnalysisResult
from api.services import ai_analyzer

router = APIRouter()

# --- Portfolio Endpoints ---
@router.post("", response_model=PortfolioRead, status_code=status.HTTP_201_CREATED, summary="Create Portfolio")
def create_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_in: PortfolioCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new portfolio for the current user.
    """
    portfolio = crud_portfolio.create_with_owner(db=db, obj_in=portfolio_in, user_id=current_user.id)
    return portfolio

@router.get("", response_model=List[PortfolioRead], summary="List User's Portfolios")
def read_portfolios(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all portfolios for the current user.
    """
    portfolios = crud_portfolio.get_multi_by_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return portfolios

@router.get("/{portfolio_id}", response_model=PortfolioReadWithHoldings, summary="Get Portfolio by ID")
def read_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific portfolio by ID, including its holdings.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@router.put("/{portfolio_id}", response_model=PortfolioRead, summary="Update Portfolio")
def update_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    portfolio_in: PortfolioUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Update a portfolio's details.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio = crud_portfolio.update(db=db, db_obj=portfolio, obj_in=portfolio_in)
    return portfolio

@router.delete("/{portfolio_id}", response_model=PortfolioRead, summary="Delete Portfolio")
def delete_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Delete a portfolio and all its associated holdings.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    deleted_portfolio = crud_portfolio.remove(db=db, id=portfolio_id, user_id=current_user.id)
    return deleted_portfolio

# --- Holding Endpoints ---
@router.post("/{portfolio_id}/holdings", response_model=HoldingRead, status_code=status.HTTP_201_CREATED, summary="Add Holding to Portfolio")
def create_holding(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    holding_in: HoldingCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new holding and add it to a portfolio.
    """
    # First, verify the user owns the portfolio
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # If ownership is confirmed, create the holding
    holding = crud_holding.create_with_portfolio(db=db, obj_in=holding_in, portfolio_id=portfolio_id)
    return holding

@router.put("/{portfolio_id}/holdings/{holding_id}", response_model=HoldingRead, summary="Update Holding in Portfolio")
def update_holding(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    holding_id: int,
    holding_in: HoldingUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Update a specific holding within a portfolio.
    """
    # Verify portfolio ownership
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get the specific holding, ensuring it's in the correct portfolio
    db_holding = crud_holding.get(db=db, id=holding_id, portfolio_id=portfolio_id)
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found in this portfolio")
        
    holding = crud_holding.update(db=db, db_obj=db_holding, obj_in=holding_in)
    return holding

@router.delete("/{portfolio_id}/holdings/{holding_id}", response_model=HoldingRead, summary="Delete Holding from Portfolio")
def delete_holding(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    holding_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Delete a specific holding from a portfolio.
    """
    # Verify portfolio ownership
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    # Get the specific holding to ensure it exists in this portfolio before deleting
    db_holding = crud_holding.get(db=db, id=holding_id, portfolio_id=portfolio_id)
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found in this portfolio")

    deleted_holding = crud_holding.remove(db=db, id=holding_id)
    return deleted_holding

# --- AI Analysis Endpoint ---

@router.post("/{portfolio_id}/analyze", response_model=AnalysisResult, summary="Get AI Analysis for Portfolio")
async def get_portfolio_analysis(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Triggers an AI-powered analysis for a specific portfolio.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    analysis_content = await ai_analyzer.analyze_portfolio(portfolio.holdings)
    return AnalysisResult(content=analysis_content)