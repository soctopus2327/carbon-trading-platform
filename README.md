# CarbonX — Carbon Trading Platform

A full-stack web application for carbon credit management, alliance formation, and sustainable trade.

---

## Overview

CarbonX is a comprehensive platform that facilitates carbon credit trading among companies committed to sustainability. It provides a structured digital environment for buying, selling, and managing carbon credits in real time, with AI-powered advisory, alliance formation, and a built-in gamification system.

A dedicated **Platform Admin portal** offers governance capabilities including company approval/rejection, user management, and transaction auditing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | Node.js 20 + Express 5 |
| Database | MongoDB (Mongoose ODM) |
| AI Service | Qwen (primary) / OpenAI (fallback) |
| Email | Custom `emailService.js` (SMTP) |
| Translation | Google Translate API |

---

## Features

- **Role-based access control** — Platform Admin, Company Admin, Trader, Auditor, Viewer
- **Carbon credit marketplace** — real-time listings, quantity selection, and controlled trade execution
- **Pay-later trade settlement** — deferred payment support for trades
- **Alliance management** — create alliances, join via codes, manage members, and track collaborative goals
- **AI Advisor** — chat interface for portfolio guidance and emissions insights
- **Gamification** — coin and points system to incentivize sustainable behavior
- **Portfolio management** — track carbon holdings, transaction history, and emissions trends
- **Community features** — news feed (via News API) and discussion forum
- **Admin portal** — user/company management, transaction auditing, and platform analytics
- **Notifications** — real-time alerts for key platform events
- **Multi-language support** — via Google Translate API integration

---

## Architecture

The platform follows a classic **three-tier architecture**:

```
React SPA  ──HTTP──►  Express REST API  ──Mongoose──►  MongoDB Atlas
                             │
                    ┌────────┴────────┐
                OpenAI API      Google Translate
                News API           SMTP Email
```

**Client layer:** Home/Auth, Company Dashboard, Admin Portal, Marketplace, Alliance Module, AI Advisor, News/Forum, Holdings & Reports, Notifications — all communicating via Axios.

**Server layer:** Modular route groups (Auth, Trade, PlatformAdmin, Company, Alliance, Transaction, Message, News, Notification) protected by JWT and role-based middleware.

---

## Data Model (Key Entities)

| Entity | Description |
|---|---|
| `User` | Identity entity with role, points, and coins |
| `Company` | Organizational entity with carbon credit balance and risk score |
| `TradeListing` | Marketplace listing with price, quantity, and pay-later date |
| `Transaction` | Immutable trade record created on purchase |
| `Alliance` | Collaborative group with join codes and member management |
| `Message` | Direct messaging between users |
| `Notification` | Event-driven alerts per user |
| `Audit` | Immutable log of all platform actions |

---

## Carbon Credit Purchase Flow

1. Trader fetches listings via `GET /trade`
2. JWT middleware verifies token and decodes identity
3. Trader selects quantity and submits `POST /trade/buy`
4. Role middleware confirms `TRADER` or `ADMIN` role
5. API validates remaining quantity on the listing
6. Listing document is updated; immutable `Transaction` record is created
7. Buyer and seller `carbonCredits` balances are updated atomically
8. API returns `HTTP 201 Created` with the transaction object
9. Client renders a success notification and refreshes the holdings view

---

## Security & Quality

- JWT-based authentication with route-level middleware
- Role-based access control enforced server-side
- Responsive UI via Tailwind CSS (desktop + mobile)
- Modular REST API for scalability and maintainability
- Test coverage: **Jest + React Testing Library** (frontend), **Mocha + Chai** (backend)

---

