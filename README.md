# CMS Monorepo

A modern content management system built with a monorepo architecture.

## Architecture

This project is organized as a pnpm monorepo with the following packages:

- **`packages/web`** - Next.js web application with Shadcn UI
- **`packages/backend`** - NestJS backend API
- **`packages/mobile`** - React Native mobile app (Ignite template)
- **`packages/shared`** - Shared types and utilities

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
# Run web app only
pnpm dev:web

# Run backend only
pnpm dev:backend

# Run mobile app only
pnpm dev:mobile

# Run all apps in parallel
pnpm dev:all
```

### Build

```bash
# Build all packages
pnpm build:all

# Build specific package
pnpm build:web
pnpm build:backend
```

## Project Structure

```
.
├── packages/
│   ├── web/          # Next.js web application
│   ├── backend/      # NestJS API
│   ├── mobile/       # React Native mobile app
│   └── shared/       # Shared code
├── package.json      # Root package.json with workspace scripts
└── pnpm-workspace.yaml
```

## Tech Stack

### Web
- Next.js 16
- React 19
- Tailwind CSS 4
- Shadcn UI
- HUGEicons

### Backend
- NestJS
- TypeScript

### Mobile
- React Native
- Expo
- Ignite Boilerplate

## Scripts

- `pnpm dev` - Start web app
- `pnpm dev:web` - Start web app
- `pnpm dev:backend` - Start backend in watch mode
- `pnpm dev:mobile` - Start mobile app
- `pnpm dev:all` - Start all apps in parallel
- `pnpm build:all` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm typecheck` - Type check all packages

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

Private - All rights reserved
