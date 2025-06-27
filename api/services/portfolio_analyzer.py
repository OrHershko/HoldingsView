from typing import List, Dict
from collections import defaultdict

from api.models.transaction import Transaction, TransactionType
from api.schemas.holding import CalculatedHolding

def calculate_holdings_from_transactions(transactions: List[Transaction]) -> List[CalculatedHolding]:
    """
    Calculates the current state of all holdings from a list of transactions.
    This function computes cost basis and quantity, but does not include live market data.
    
    For options, each unique contract (symbol + option_type + strike_price + expiration_date)
    is treated as a separate holding.
    """
    # A dictionary to track the state of each holding
    # Key format: "symbol" for stocks, "symbol_CALL_150.0_2025-01-17" for options
    holdings_state: Dict[str, Dict] = defaultdict(lambda: {
        "quantity": 0.0, 
        "total_cost": 0.0,
        "is_option": False,
        "option_type": None,
        "strike_price": None,
        "expiration_date": None,
        "underlying_symbol": None,
        "display_symbol": None
    })

    # Sort transactions by date to process them in chronological order
    sorted_transactions = sorted(transactions, key=lambda t: t.transaction_date)

    for t in sorted_transactions:
        if t.is_option:
            # For options, create a unique key that includes all contract details
            holding_key = f"{t.symbol}_{t.option_type}_{t.strike_price}_{t.expiration_date}"
            display_symbol = f"{t.underlying_symbol} {t.expiration_date.strftime('%m/%d/%y')} {t.strike_price}{t.option_type[0]}"
        else:
            # For stocks, use just the symbol
            holding_key = t.symbol
            display_symbol = t.symbol

        state = holdings_state[holding_key]
        
        # Set the metadata for this holding
        if t.is_option:
            state["is_option"] = True
            state["option_type"] = t.option_type
            state["strike_price"] = t.strike_price
            state["expiration_date"] = t.expiration_date
            state["underlying_symbol"] = t.underlying_symbol
            state["display_symbol"] = display_symbol
        else:
            state["display_symbol"] = display_symbol

        # Process the transaction
        if t.transaction_type == TransactionType.BUY:
            state["quantity"] += t.quantity
            state["total_cost"] += t.quantity * t.price
        elif t.transaction_type == TransactionType.SELL:
            # Ensure there is a quantity to sell to avoid division by zero
            if state["quantity"] > 0:
                # Reduce cost basis proportionally. This is crucial for correct avg cost calculation.
                proportion_sold = t.quantity / state["quantity"]
                state["total_cost"] *= (1 - proportion_sold)
            
            state["quantity"] -= t.quantity

    # Now, format the final state into CalculatedHolding objects
    calculated_holdings: List[CalculatedHolding] = []
    for holding_key, state in holdings_state.items():
        # Only include holdings with a positive quantity. Use epsilon for float comparison.
        if state["quantity"] > 1e-9: 
            quantity = state["quantity"]
            total_cost = state["total_cost"]
            avg_cost_basis = total_cost / quantity if quantity > 0 else 0
            
            if state["is_option"]:
                calculated_holdings.append(
                    CalculatedHolding(
                        symbol=state["display_symbol"],  # Use formatted display symbol
                        quantity=quantity,
                        average_cost_basis=avg_cost_basis,
                        total_cost_basis=total_cost * 100,
                        is_option=True,
                        option_type=state["option_type"],
                        strike_price=state["strike_price"],
                        expiration_date=state["expiration_date"],
                        underlying_symbol=state["underlying_symbol"],
                    )
                )
            else:
                calculated_holdings.append(
                    CalculatedHolding(
                        symbol=state["display_symbol"],
                        quantity=quantity,
                        average_cost_basis=avg_cost_basis,
                        total_cost_basis=total_cost,
                        is_option=False,
                    )
                )

    return sorted(calculated_holdings, key=lambda h: (h.is_option, h.symbol))