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

## 🛠️ Setup Guide

### Prerequisites
- **Python 3.13+**
- **Node.js 18+** and npm
- **PostgreSQL 15+**
- **Redis** (for background tasks)
- **Git**

### Environment Variables
Create a `.env` file in the `api/` directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/holdingsview
TEST_DATABASE_URL=postgresql://username:password@localhost:5432/holdingsview_test

# Redis Configuration (for Celery)
REDIS_URL=redis://localhost:6379

# Firebase Configuration (for authentication)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=your-client-cert-url

# OpenRouter API (for AI analysis)
OPENROUTER_API_KEY=your-openrouter-api-key

# Application Settings
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Database Setup

1. **Install PostgreSQL** and create databases:
```bash
createdb holdingsview
createdb holdingsview_test
```

2. **Run database migrations**:
```bash
cd api
pip install -r requirements.txt
alembic upgrade head
```

### Backend Setup

1. **Navigate to the API directory**:
```bash
cd api
```

2. **Create and activate virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Python dependencies**:
```bash
pip install -r requirements.txt
```

4. **Start Redis server** (required for background tasks):
```bash
redis-server
```

5. **Start Celery worker** (in a new terminal):
```bash
cd api
source venv/bin/activate
celery -A worker.celery worker --loglevel=info
```

6. **Start Celery beat scheduler** (in another terminal):
```bash
cd api
source venv/bin/activate
celery -A worker.celery beat --loglevel=info
```

7. **Start the FastAPI backend**:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to the web directory**:
```bash
cd web
```

2. **Install Node.js dependencies**:
```bash
npm install
```

3. **Create environment file** (`.env.local`):
```bash
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

4. **Start the development server**:
```bash
npm run dev
```

The web application will be available at `http://localhost:5173`

### Docker Setup (Alternative)

For a quick setup using Docker:

1. **Clone the repository**:
```bash
git clone <repository-url>
cd HoldingsView
```

2. **Create environment files** as described above

3. **Run with Docker Compose**:
```bash
docker-compose up -d
```

This will start all services:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### Running Tests

**Backend tests**:
```bash
cd api
source venv/bin/activate
pytest
```

**Frontend tests**:
```bash
cd web
npm run test
```

### Development Workflow

1. **Start all services**:
   - PostgreSQL database
   - Redis server
   - Backend API (`uvicorn main:app --reload`)
   - Celery worker
   - Celery beat scheduler
   - Frontend development server (`npm run dev`)

2. **Access the application**:
   - Web app: `http://localhost:5173`
   - API docs: `http://localhost:8000/docs`
   - API redoc: `http://localhost:8000/redoc`

3. **Make changes** and they will auto-reload in development mode

### Production Deployment

1. **Build the frontend**:
```bash
cd web
npm run build
```

2. **Use the production Docker setup** or deploy to your preferred hosting platform

3. **Set production environment variables** with proper security configurations

### Troubleshooting

- **Database connection issues**: Ensure PostgreSQL is running and credentials are correct
- **Redis connection issues**: Ensure Redis server is running
- **Import errors**: Make sure all dependencies are installed in the virtual environment
- **Port conflicts**: Check if ports 3000, 8000, 5432, or 6379 are already in use
- **Firebase errors**: Verify Firebase configuration and ensure proper service account setup
- **Foreign key constraint violation when creating portfolios**: This happens when `DISABLE_AUTH_FOR_DEV=true` is set but the development user doesn't exist in the database. The application will automatically create the development user on first request, but if you see this error, restart the API server or manually set `DISABLE_AUTH_FOR_DEV=false` in your environment variables
- **"Authentication is disabled for development" warning**: This is normal when `DISABLE_AUTH_FOR_DEV=true` - it allows testing without Firebase tokens
- **Pandas warning about pkg_resources**: This is a deprecation warning from the pandas_ta library and can be safely ignored

### Continuous Integration

This project uses GitHub Actions to ensure code quality. On every push to `main` or pull request, the following checks are automatically performed:

- **Linting**: Code style and format are checked with `ruff`.
- **Testing**: The full `pytest` suite is run against a PostgreSQL database to verify all features.
- **Coverage**: Maintains 82% test coverage across the application.
