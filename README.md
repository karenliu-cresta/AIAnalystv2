# AI Analyst v2

Cresta's chatbot for deep research on customer data. Supports charts, reports, comparisons, and survey data analysis.

## Features

- 📊 **Charts**: Generate visualizations of customer engagement, retention, and activity
- 📄 **Reports**: Comprehensive analysis with insights and metrics
- ⚖️ **Compare**: Side-by-side comparisons of different data segments
- 📋 **Survey**: Survey data analysis and feedback aggregation

## Tech Stack

- **React** + **TypeScript**
- **Vite** (build tool)
- **Zustand** (state management)
- **Mantine** (UI components)
- **Recharts** (data visualization)
- Mock API with local JSON/TS objects

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── api/          # Mock API calls
├── components/   # Reusable components
├── mocks/        # Mock data
├── pages/        # Page components
├── store/        # Zustand state management
├── types/        # TypeScript type definitions
├── App.tsx
└── main.tsx
```

## Design

Based on Figma design: [AI Analyst 2.0](https://www.figma.com/design/kYGm4XWzig6s27fcZ0hqjN/AI-Analyst-2.0?node-id=400-3448)

## Component Priority

1. **Storybook** design system (primary)
2. **Mantine UI** (fallback)
3. Ask for clarification if component doesn't exist in either
