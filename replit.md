# Overview

SolFlip is a provably fair cryptocurrency coinflip game built on the Solana blockchain. The application allows users to connect their Phantom wallet, place SOL bets on coinflip outcomes (heads or tails), and play with verifiable random number generation using Proov.Network VRF technology. The game features real-time updates via WebSocket connections, streak tracking with multipliers, and a comprehensive game history system.

## Recent Changes (August 2, 2025)
- Implemented complete Proov.Network VRF backend for provably fair gaming
- Fixed all compilation errors and component import issues
- Enhanced UI with better visual indicators for heads/tails selection
- Removed fake leaderboard as requested by user
- Added debug mode for testing without wallet connection
- Improved error handling and logging for debugging wallet connection issues

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom gaming theme (dark mode, neon colors, gradient backgrounds)
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Wallet Integration**: Custom Phantom wallet integration with Solana Web3.js

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Real-time Communication**: WebSocket server for live game updates and notifications
- **Session Management**: In-memory storage with fallback to PostgreSQL for production

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon Database hosting
- **ORM**: Drizzle ORM with migrations support
- **Schema Design**: Four main tables - users, games, gameStreaks, vrfProofs
- **In-Memory Cache**: MemStorage class for development and caching frequently accessed data

## Authentication and Authorization
- **Wallet-Based Auth**: Solana wallet signature verification using nacl cryptography
- **Session Storage**: Connect-pg-simple for PostgreSQL session storage
- **User Creation**: Automatic user creation on first wallet connection
- **Security**: Message signing for wallet verification without exposing private keys

## Game Logic and Fairness
- **VRF Implementation**: Custom verifiable random function for provably fair game outcomes
- **Streak System**: Exponential multiplier system (2^streak) with maximum tracking
- **House Edge**: Configurable house edge (default 2%) applied to winnings
- **Game States**: Pending, completed, failed status tracking with transaction signatures

## Blockchain Integration
- **Solana Network**: Supports both devnet and mainnet environments
- **Wallet Support**: Phantom wallet integration with balance checking and transaction signing
- **Transaction Handling**: SOL transfers using Solana Web3.js with proper lamport conversion
- **Network Switching**: Environment-based RPC endpoint configuration

## Real-time Features
- **WebSocket Server**: Dedicated WebSocket endpoint (/ws) for real-time updates
- **Live Updates**: Game results, balance changes, and streak updates broadcast instantly
- **Connection Management**: Automatic reconnection and client state management
- **Message Broadcasting**: Server-to-all-clients communication for shared game events

# External Dependencies

## Database Services
- **Neon Database**: PostgreSQL hosting with connection pooling
- **Drizzle Kit**: Database migration and schema management tools

## Blockchain Services
- **Solana RPC**: Official Solana RPC endpoints for devnet and mainnet
- **Phantom Wallet**: Browser extension wallet for user authentication and transactions

## UI and Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Fast build tool with hot module replacement and TypeScript support
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment plugins for seamless deployment

## Cryptography and Security
- **tweetnacl**: Cryptographic library for signature verification
- **bs58**: Base58 encoding/decoding for Solana addresses and signatures
- **crypto**: Node.js built-in crypto module for random number generation

## Communication
- **WebSocket (ws)**: Real-time bidirectional communication between client and server
- **Express Session**: Session management with PostgreSQL storage
- **CORS**: Cross-origin resource sharing for secure API access