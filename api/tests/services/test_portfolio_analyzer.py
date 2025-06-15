import pytest
from datetime import date

from api.models.transaction import Transaction, TransactionType
from api.services.portfolio_analyzer import calculate_holdings_from_transactions


@pytest.fixture
def sample_transactions() -> list[Transaction]:
    """Provides a sample list of transaction objects for testing."""
    return [
        # Buy 10 AAPL @ 150 -> Total Cost: 1500
        Transaction(
            symbol="AAPL",
            transaction_type=TransactionType.BUY,
            quantity=10,
            price=150.0,
            transaction_date=date(2023, 1, 1),
        ),
        # Buy 5 GOOG @ 100 -> Total Cost: 500
        Transaction(
            symbol="GOOG",
            transaction_type=TransactionType.BUY,
            quantity=5,
            price=100.0,
            transaction_date=date(2023, 1, 15),
        ),
        # Buy 5 more AAPL @ 160.
        # New AAPL state: 15 shares, Total Cost: 1500 + 800 = 2300
        # Avg Cost: 2300 / 15 = 153.33
        Transaction(
            symbol="AAPL",
            transaction_type=TransactionType.BUY,
            quantity=5,
            price=160.0,
            transaction_date=date(2023, 2, 1),
        ),
        # Sell 7 AAPL.
        # Proportion sold: 7/15. Remaining shares: 8
        # Remaining cost basis: 2300 * (1 - 7/15) = 2300 * 8/15 = 1226.67
        Transaction(
            symbol="AAPL",
            transaction_type=TransactionType.SELL,
            quantity=7,
            price=180.0,
            transaction_date=date(2023, 3, 1),
        ),
        # Sell all 5 GOOG. Remaining: 0.
        Transaction(
            symbol="GOOG",
            transaction_type=TransactionType.SELL,
            quantity=5,
            price=120.0,
            transaction_date=date(2023, 4, 1),
        ),
    ]


def test_calculate_holdings_from_transactions(sample_transactions: list[Transaction]):
    """Tests that holdings are correctly calculated from a list of transactions."""
    calculated_holdings = calculate_holdings_from_transactions(sample_transactions)

    # GOOG was completely sold off, so only AAPL should remain.
    assert len(calculated_holdings) == 1

    aapl_holding = calculated_holdings[0]

    assert aapl_holding.symbol == "AAPL"

    # Remaining shares = 15 - 7 = 8.
    assert aapl_holding.quantity == pytest.approx(8)

    # Remaining cost basis = 2300 * (8/15) = 1226.66...
    assert aapl_holding.total_cost_basis == pytest.approx(1226.666666)

    # Average cost basis = Remaining Cost / Remaining Quantity = 1226.66... / 8 = 153.33...
    assert aapl_holding.average_cost_basis == pytest.approx(153.333333)

    # Check that market data fields are not populated by this service
    assert aapl_holding.current_price is None
    assert aapl_holding.market_value is None
    assert aapl_holding.unrealized_gain_loss is None
    assert aapl_holding.unrealized_gain_loss_percent is None


def test_empty_transactions_list():
    """Tests that an empty list of transactions results in an empty list of holdings."""
    calculated_holdings = calculate_holdings_from_transactions([])
    assert len(calculated_holdings) == 0


def test_transactions_are_sorted_by_date_for_calculation():
    """Ensures that calculation is correct even if transactions are provided out of order."""
    unsorted_transactions = [
        Transaction(
            symbol="TSLA",
            transaction_type=TransactionType.SELL,
            quantity=5,
            price=200.0,
            transaction_date=date(2023, 6, 1),
        ),
        Transaction(
            symbol="TSLA",
            transaction_type=TransactionType.BUY,
            quantity=10,
            price=100.0,
            transaction_date=date(2023, 1, 1),
        ),
    ]

    # A correct implementation sorts by date, processing BUY then SELL.
    calculated_holdings = calculate_holdings_from_transactions(unsorted_transactions)

    assert len(calculated_holdings) == 1
    tsla_holding = calculated_holdings[0]

    assert tsla_holding.symbol == "TSLA"
    assert tsla_holding.quantity == pytest.approx(5)  # 10 - 5
    # Original cost: 10 * 100 = 1000. Sold 5/10. Remaining cost = 1000 * (1 - 5/10) = 500
    assert tsla_holding.total_cost_basis == pytest.approx(500.0)
    assert tsla_holding.average_cost_basis == pytest.approx(100.0) # 500 / 5