# BudgetWise – Professional Expense & Budget Management

BudgetWise is a full-stack personal finance application that enables users to track expenses, manage monthly and category-based budgets, and monitor savings goals.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture
The project is built with a clear separation between the frontend and backend:

- **Frontend**: A modern React application built with TypeScript, Vite, and Tailwind CSS. It features a responsive dashboard and intuitive forms for data entry.
- **Backend**: Business logic is implemented in a structured, object-oriented manner (Controller → Service → Repository) within the `backend` directory, utilizing Supabase Edge Functions for secure data management.

## 📄 Documentation
Comprehensive design documentation is available in the root directory:
- `idea.md`: Project scope and key features.
- `classDiagram.md`: Object-oriented design of the backend services.
- `ErDiagram.md`: Database schema and entity relationships.
- `sequenceDiagram.md`: End-to-end data flow visualization.
- `useCaseDiagram.md`: User interaction map.

## ✅ SESD Evaluation Compliance
- **OOP Principles**: Used for modeling core financial entities and services.
- **Clean Architecture**: Decoupled layers for HTTP handling, business logic, and data access.
- **Security**: JWT-based authentication and Row Level Security (RLS).




