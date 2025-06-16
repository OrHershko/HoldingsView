A comprehensive **web-based** financial investment platform built with React, TypeScript, and FastAPI, featuring advanced charting capabilities, portfolio management, and AI-powered stock analysis. Designed as a modern web application with responsive design that works seamlessly across desktop and mobile browsers.

## 🚀 Features

- **Modern Tech Stack**: Built with React 18, TypeScript, Vite for frontend and FastAPI (Python) for backend
- **Advanced Charting**: Integration with ApexCharts and Lightweight Charts for financial data visualization
- **Portfolio Management**: Track investments, monitor performance, and analyze returns
- **Multi-Stock Management**: Add multiple stocks at once via manual entry or CSV upload
- **AI Analysis**: Get AI-powered insights and recommendations for your stock portfolio via OpenRouter
- **Authentication**: Secure user authentication via Firebase
- **Comprehensive UI Components**: Utilizing Radix UI primitives for accessible and customizable components
- **Responsive Web Design**: Built with Tailwind CSS for optimal viewing across all devices and screen sizes
- **Form Handling**: Integrated with React Hook Form and Zod for robust form validation
- **State Management**: Uses TanStack Query for efficient server state management
- **Routing**: Implements React Router for seamless navigation
- **Theme Support**: Dark/Light mode support via next-themes
- **Technical Analysis**: Includes technical indicators for financial analysis
- **Background Processing**: Celery-powered task queue for market data fetching and AI analysis
- **Reliable AI Integration**: Robust OpenRouter client with retry mechanism and error handling

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

## ⚙️ Backend Development

### Technology Stack
- **Core**:
  - FastAPI (Python 3.11+)
  - SQLAlchemy ORM
  - Alembic (database migrations)
  - Docker & Docker Compose
- **Database**:
  - PostgreSQL 15+
- **Background Processing**:
  - Celery with Redis broker
  - Celery Beat for scheduled tasks
- **AI Integration**:
  - OpenRouter API for AI-powered analysis
  - Configurable retry mechanism with exponential backoff
  - Robust error handling and serialization
- **Testing & Quality**:
  - Pytest for unit and integration testing
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

### Continuous Integration
This project uses GitHub Actions to ensure code quality. On every push to `main` or pull request, the following checks are automatically performed:
- **Linting**: Code style and format are checked with `ruff`.
- **Testing**: The full `pytest` suite is run against a PostgreSQL database to verify all features.

## �� Project Structure