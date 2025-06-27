# HoldingsView 📈

A comprehensive **web-based** financial investment platform built with React, TypeScript, and FastAPI, featuring advanced charting capabilities, portfolio management, options trading, and AI-powered stock analysis. Designed as a modern web application with responsive design that works seamlessly across desktop and mobile browsers.

## 🚀 Features

### Core Investment Management
- **Portfolio Management**: Track investments, monitor performance, and analyze returns
- **Multi-Stock Management**: Add multiple stocks at once via manual entry or CSV upload
- **Options Trading**: Full support for options transactions including calls and puts with expiration dates and strike prices
- **Real-time Market Data**: Live stock prices, option chains, and market data via Yahoo Finance integration
- **Transaction History**: Comprehensive tracking of all stock and options trades

### Advanced Analytics & AI
- **AI Analysis**: Get AI-powered insights and recommendations for your stock portfolio via OpenRouter
- **Trading Strategies**: AI-generated actionable trading recommendations
- **Stock Deep Dive**: Comprehensive individual stock analysis with market data enrichment
- **Technical Analysis**: Advanced technical indicators and charting capabilities
- **Portfolio Snapshots**: Historical performance tracking with automated daily snapshots

### Modern Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: FastAPI (Python 3.13+), SQLAlchemy, PostgreSQL
- **Charts**: Integration with ApexCharts and Lightweight Charts for financial data visualization
- **Authentication**: Secure user authentication via Firebase
- **UI Components**: Utilizing Radix UI primitives for accessible and customizable components
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **State Management**: TanStack Query for efficient server state management

### User Experience
- **Responsive Web Design**: Built with Tailwind CSS for optimal viewing across all devices and screen sizes
- **Accessibility**: WCAG compliant with proper ARIA labels, form accessibility, and screen reader support
- **Theme Support**: Dark/Light mode support via next-themes
- **Progressive Web App**: Can be installed as a web app for native-like experience
- **Real-time Updates**: Live data synchronization without page refreshes

## 💻 Web Application

Holdings View is designed as a **modern web application** that runs in your browser. Key characteristics:

- **Cross-Platform**: Works on any device with a modern web browser (desktop, tablet, mobile)
- **No Installation Required**: Access instantly through your web browser
- **Progressive Web App (PWA) Ready**: Can be installed as a web app for native-like experience
- **Responsive Design**: Automatically adapts to different screen sizes and orientations
- **Real-time Updates**: Live data synchronization without page refreshes
- **Asynchronous Processing**: Background tasks for data analysis with status tracking

### Accessing the Application
- **Development**: `http://localhost:5173` (frontend) + `http://localhost:8000` (API)
- **Production**: Deploy to your preferred web hosting platform

## 📊 Options Trading Features

### Complete Options Support
- **Options Transactions**: Buy and sell call and put options
- **Real-time Option Chains**: Live option chain data with bid/ask prices
- **Strike Price Selection**: Interactive strike price selection with current market data
- **Expiration Date Management**: Support for multiple expiration dates
- **Intelligent Price Refresh**: Automatically uses bid prices for sell orders and ask prices for buy orders
- **Portfolio Integration**: Options positions integrated with overall portfolio performance

### Options Data Management
- **Market Data Integration**: Real-time option chain data from Yahoo Finance
- **Price Discovery**: Automatic bid/ask price suggestions based on transaction type
- **Data Validation**: Comprehensive validation for option contract parameters
- **Error Handling**: Robust error handling for market data edge cases (NaN values, missing data)

## ⚙️ Backend Development

### Technology Stack
- **Core**:
  - FastAPI (Python 3.13+)
  - SQLAlchemy ORM with options trading models
  - Alembic (database migrations)
  - Docker & Docker Compose
- **Database**:
  - PostgreSQL 15+
  - Comprehensive transaction models for stocks and options
- **Market Data**:
  - Yahoo Finance integration with yfinance
  - Real-time stock prices and option chains
  - Robust NaN value handling for financial data
  - Symbol search with deduplication
- **Background Processing**:
  - Celery with Redis broker
  - Celery Beat for scheduled tasks
- **AI Integration**:
  - OpenRouter API for AI-powered analysis
  - Configurable retry mechanism with exponential backoff
  - Robust error handling and serialization
- **Testing & Quality**:
  - Pytest for unit and integration testing with 82% coverage
  - Comprehensive test suite for options functionality
  - Ruff for linting and code formatting
  - GitHub Actions for Continuous Integration (CI)

### AI Features
- **Portfolio Analysis**: AI-powered portfolio composition analysis
- **Stock Deep Dive**: Comprehensive individual stock analysis with SWOT format
- **Trading Strategies**: AI-generated short-term trading recommendations
- **Market Data Enrichment**: Background processing of market fundamentals and technicals
- **Error Resilience**: Automatic retry for transient API failures

### Background Processing
- **Portfolio Snapshots**: Nightly calculation of portfolio performance history
- **Market Data Tasks**: Asynchronous enrichment of stock data
- **AI Analysis Tasks**: Background AI processing with status tracking
- **Task Monitoring**: RESTful endpoints for task status and result retrieval

### Recent Improvements
- **Options Trading**: Complete options trading functionality with real-time market data
- **Accessibility**: WCAG compliance with proper form labels, ARIA attributes, and screen reader support
- **Data Quality**: Fixed JSON serialization issues with NaN values in option chain data
- **Symbol Search**: Improved symbol search with proper deduplication
- **Form Validation**: Enhanced form validation for both stock and options transactions
- **Error Handling**: Comprehensive error handling for edge cases in market data

### Continuous Integration
This project uses GitHub Actions to ensure code quality. On every push to `main` or pull request, the following checks are automatically performed:
- **Linting**: Code style and format are checked with `ruff`.
- **Testing**: The full `pytest` suite is run against a PostgreSQL database to verify all features.
- **Coverage**: Maintains 82% test coverage across the application.
