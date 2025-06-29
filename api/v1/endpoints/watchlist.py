from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.auth.firebase import get_current_user, get_db
from api.crud import crud_watchlist_item
from api.models.user import User
from api.schemas.watchlist import WatchlistItem, WatchlistItemCreate

router = APIRouter()

@router.get("", response_model=List[WatchlistItem])
def read_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the current user's watchlist.
    """
    return crud_watchlist_item.get_multi_by_user(db=db, user_id=current_user.id)

@router.post("", response_model=WatchlistItem, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    *,
    db: Session = Depends(get_db),
    item_in: WatchlistItemCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Add a new symbol to the user's watchlist.
    """
    existing_item = crud_watchlist_item.get_by_symbol_and_user(db=db, user_id=current_user.id, symbol=item_in.symbol)
    if existing_item:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Symbol already exists in the watchlist.",
        )
    return crud_watchlist_item.create_with_user(db=db, obj_in=item_in, user_id=current_user.id)

@router.delete("/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_watchlist(
    *,
    db: Session = Depends(get_db),
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    """
    Remove a symbol from the user's watchlist.
    """
    item = crud_watchlist_item.get_by_symbol_and_user(db=db, user_id=current_user.id, symbol=symbol)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Symbol not found in the watchlist.",
        )
    crud_watchlist_item.remove(db=db, id=item.id)
    return
