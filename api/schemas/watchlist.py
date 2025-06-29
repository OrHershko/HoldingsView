from pydantic import BaseModel

class WatchlistItemBase(BaseModel):
    symbol: str
    name: str

class WatchlistItemCreate(WatchlistItemBase):
    pass

class WatchlistItemUpdate(WatchlistItemBase):
    pass

class WatchlistItemInDBBase(WatchlistItemBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class WatchlistItem(WatchlistItemInDBBase):
    pass
