# BudgetWise – Personal Finance & Expense Tracker

## Overview
BudgetWise is a comprehensive personal finance application built to help users seamlessly track their daily expenses, manage monthly budgets, and reach their long-term savings goals.

The application leverages a modern tech stack with a focused backend architecture to ensure security, reliability, and ease of use.

## Key Features
- **User Authentication**: Secure sign-up/login via Supabase Auth.
- **Expense Management**: Multi-user transaction recording with category and payment mode selection.
- **Intelligent Budgeting**: Automated budget monitoring with real-time overspending alerts. Supports both monthly and category-specific limits.
- **Savings Progression**: Visual tracking of long-term savings goals with progress indicators.
- **Real-time Analytics**: Dashboard summaries for monthly spending and transaction history.

## Architecture
The project follows a **Clean Layered Architecture** within its backend service:
- **Controller Layer**: Handles HTTP requests, validates input, and maps responses.
- **Service Layer**: Implements core business logic (e.g., calculating budget status).
- **Repository Layer**: Abstracts database operations using the Supabase client.

## Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI.
- **Backend Service**: Deno (Supabase Edge Functions), TypeScript.
- **Database**: PostgreSQL (Supabase) with Row Level Security (RLS).
