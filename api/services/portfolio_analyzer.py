from typing import List, Dict
from collections import defaultdict

from api.models.transaction import Transaction, TransactionType
from api.schemas.holding import CalculatedHolding

def calculate_holdings_from_transactions(transactions: List[Transaction]) -> List[CalculatedHolding]:
    """
    Calculates the current state of all holdings from a list of transactions.
    This function computes cost basis and quantity, but does not include live market data.
    """
    # A dictionary to track the state of each symbol: {symbol: {'quantity': float, 'total_cost': float}}
    holdings_state: Dict[str, Dict] = defaultdict(lambda: {"quantity": 0.0, "total_cost": 0.0})

    # Sort transactions by date to process them in chronological order
    sorted_transactions = sorted(transactions, key=lambda t: t.transaction_date)

    for t in sorted_transactions:
        state = holdings_state[t.symbol]
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
    for symbol, state in holdings_state.items():
        # Only include holdings with a positive quantity. Use epsilon for float comparison.
        if state["quantity"] > 1e-9: 
            quantity = state["quantity"]
            total_cost = state["total_cost"]
            avg_cost_basis = total_cost / quantity if quantity > 0 else 0
            
            calculated_holdings.append(
                CalculatedHolding(
                    symbol=symbol,
                    quantity=quantity,
                    average_cost_basis=avg_cost_basis,
                    total_cost_basis=total_cost,
                )
            )

    return sorted(calculated_holdings, key=lambda h: h.symbol)