# Overview

Tramia is an enterprise-grade customer and admin dashboard designed as a multi-tenant platform for managing AI-powered customer interactions. The system serves as a centralized control hub that connects with existing backend services (n8n, Postgres, Chatwoot, HeyReach) to provide comprehensive management of AI agents, conversations, knowledge bases, and operational workflows. The application focuses on lead qualification, customer engagement automation, and business intelligence reporting for growth-oriented organizations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses a modern React-based stack built with Vite as the build tool and TypeScript for type safety. The UI is constructed using Tailwind CSS with shadcn/ui components for consistency and accessibility. The frontend follows a component-based architecture with clear separation between pages, components, and utilities.

**State Management**: TanStack Query (React Query) handles all server state management, caching, and synchronization. This choice provides excellent developer experience with automatic background updates, optimistic updates, and robust error handling.

**Routing**: The application uses Wouter for client-side routing, providing a lightweight alternative to React Router while maintaining essential navigation features.

**Styling Strategy**: The design system implements Tramia's "inteligencia operativa" (operational intelligence) aesthetic - a neo-minimal + soft brutalism approach featuring clean functional surfaces, precise micro-interactions, and zero unnecessary ornamentation. The system uses 2xl corner radius, soft shadows, and subtle frosted glass effects for toolbars/overlays.

**Color Palette**: Carbon base (#0B0F14), Graphite surfaces (#111827), Ivory contrast (#F8FAFC), with Tramia Cyan (#06B6D4) for primary actions and Tramia Lime (#A3E635) for success/AI-on states. Warning states use Amber (#F59E0B) and errors use Rose (#F43F5E).

**Typography**: Geist/Inter for UI text with compact tracking and clear hierarchies (h1: 28-32px, h2: 22-24px, body: 14-16px). IBM Plex Mono for technical elements like IDs and payloads to highlight technical content.

**Motion System**: Sober motion with 120-180ms timing using cubic-bezier(0.2, 0.8, 0.2, 1) easing. Spring animations on hover/press for CTAs, with Tramia Cyan → Lime gradient for key actions.

**Railway Watermarks**: Diagonal line patterns in headers evoke "vías" (railway tracks) representing the agent rail system concept.

## Backend Architecture
The backend follows a Backend-for-Frontend (BFF) pattern built with Express.js and Node.js. This approach provides a tailored API layer that aggregates and transforms data from multiple backend services.

**Database Layer**: Drizzle ORM with PostgreSQL provides type-safe database operations and schema management. The database stores organizational data, user management, agent configurations, knowledge items, job queues, and audit logs.

**API Design**: RESTful endpoints organized by domain (auth, integrations, agents, knowledge, conversations, etc.) with consistent error handling and response formatting.

**Real-time Communication**: WebSocket support for live updates to dashboards and job queue status, ensuring users see real-time changes without manual refreshing.

## Authentication and Authorization
The system implements enterprise-grade authentication using OIDC (OpenID Connect) for single sign-on capabilities. The architecture supports integration with popular identity providers like Auth0, Keycloak, or Authentik.

**Session Management**: JWT tokens with HttpOnly cookies for secure session handling, preventing XSS attacks while maintaining stateless server architecture.

**Role-Based Access Control (RBAC)**: Multi-tenant RBAC system with organization-level isolation and hierarchical permissions (admin, operator, viewer roles).

## Integration Architecture
The application serves as an orchestration layer connecting multiple specialized services:

**Chatwoot Integration**: Manages customer conversations with deep-linking capabilities for seamless navigation between the dashboard and conversation interface.

**HeyReach Integration**: Handles LinkedIn outreach and lead management workflows.

**n8n Integration**: Provides workflow automation and trigger management for complex business processes.

**Knowledge Management**: Vector-based search system for RAG (Retrieval Augmented Generation) capabilities, supporting multiple content types (PDF, CSV, Markdown, URLs).

## Data Management
The schema design supports multi-tenancy with clear organizational boundaries. Key entities include organizations, users, integrations, agent configurations, knowledge items, jobs, conversations, webhook logs, and audit logs.

**Job Queue System**: Asynchronous job processing with status tracking, retry mechanisms, and failure handling for reliable background operations.

**Audit Logging**: Comprehensive audit trail for all system changes, supporting compliance and debugging requirements.

# External Dependencies

## Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations and migration management
- **Express.js**: Web application framework for API endpoints

## Authentication & Identity
- **OIDC Providers**: Auth0, Keycloak, or Authentik for single sign-on
- **JWT**: Token-based authentication with HttpOnly cookie security

## UI & Design System
- **shadcn/ui**: Comprehensive React component library built on Radix UI
- **Radix UI**: Accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

## State Management & Data Fetching
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form management with validation
- **Zod**: Runtime type validation and schema definition

## External Service Integrations
- **Chatwoot**: Customer conversation management platform
- **HeyReach**: LinkedIn outreach and lead generation service
- **n8n**: Workflow automation and business process management
- **WebSocket**: Real-time communication for live dashboard updates

## Development & Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer support

## Monitoring & Analytics
- **Recharts**: Data visualization and charting library
- **Date-fns**: Date manipulation and formatting utilities
- **WebSocket**: Live system health monitoring and real-time updates