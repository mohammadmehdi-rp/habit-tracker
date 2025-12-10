# Habit Tracker with Motivational Quotes

Service-Oriented Architecture (SOA) project implementing a small but complete multi-service application for tracking daily habits and displaying motivational quotes.

Author: **Mohammadmehdi Rajabpourshirazy**  
Course: **Service Design and Engineering (SDE)**

## Quick Command Cheat Sheet

### Docker (recommended for demo)

From project root:

````bash
# Build and start all services + CLI container
docker compose up --build

# Stop containers
docker compose down

# Open a shell in CLI container
docker exec -it habit-cli sh

# Inside CLI container: main commands
npm run cli -- register alice pass123
npm run cli -- login alice pass123
npm run cli -- add-habit "Study 1 hour" daily
npm run cli -- list-habits
npm run cli -- complete-habit 1
npm run cli -- daily-summary
````

### Or Start Locally 
````bash
npm install
npm run start:all
````

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Running the Project (Without Docker)](#running-the-project-without-docker)
- [Running the Project (With Docker Compose)](#running-the-project-with-docker-compose)
- [CLI Usage](#cli-usage)
- [API Documentation (Swagger)](#api-documentation-swagger)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Development Notes](#development-notes)
- [Possible Extensions](#possible-extensions)

---

## Overview

The goal of this project is to demonstrate a **service-oriented architecture** using a realistic but compact scenario:

> A **Habit Tracker** that lets users register, log in, define daily habits, mark them as completed, and get a **daily summary** enriched with a **motivational quote** fetched from an external API.

The system is implemented as a set of independent Node.js services:

- Authentication and token management
- Habit data storage
- Habit statistics and streak computation
- External quote adapter (ZenQuotes.io)
- Gateway service orchestrating all of the above
- CLI (Command Line Interface) frontend

---

## Features

- **User registration and login**
  - Credentials stored securely with password hashing.
  - Token-based authentication (random tokens stored in DB).

- **Habit management**
  - Create habits with a name and frequency (e.g. daily).
  - List all habits for the logged-in user.
  - Mark a habit as completed for a given day.

- **Daily summary and motivational quote**
  - Compute daily completion rate and status for each habit.
  - Fetch a motivational quote from **ZenQuotes.io** via an adapter service.
  - Combine statistics + quote into a single response exposed by the Gateway.

- **Service-Oriented Architecture**
  - Separate services for data, business logic, adapters, and process-centric orchestration.
  - REST-based JSON APIs.
  - Shared SQLite database for persistence.

- **Documentation and tooling**
  - Swagger UI for API exploration.
  - CLI for quick interaction and testing.
  - Docker Compose setup to run the whole system with containers.

---

## Architecture

The system is structured into several services, following the classic SOA layering:

- **Process-Centric Layer**
  - `gateway-service`: main entry point for the CLI; verifies tokens and orchestrates calls to other services.

- **Business Logic Layer**
  - `habit-stats-service`: computes daily completion rates and streaks by calling the data service.

- **Data Services Layer**
  - `habit-data-service`: encapsulates all CRUD operations for habits and habit logs, backed by SQLite.

- **Adapter Layer**
  - `quote-adapter-service`: wrapper around **ZenQuotes.io**, normalising responses to a simple `{ text, author }` format.

- **Cross-cutting Authentication**
  - `auth-service`: manages user registration, login, and token verification.

- **Client**
  - `cli`: Node.js script which interacts only with `auth-service` and `gateway-service`.

Calls between services use HTTP. In Docker, services communicate using Docker service names (e.g. `http://auth:4001`, `http://gateway:4000`).

---

## Technology Stack

- **Language:** Node.js (JavaScript)
- **Framework:** Express
- **Database:** SQLite (via `sqlite3` package)
- **External API:** [ZenQuotes.io](https://zenquotes.io/)
- **Containerization:** Docker, Docker Compose
- **Documentation:** Swagger UI (OpenAPI)
- **CLI tools:** Node.js script with `npm` commands

---

## Project Structure

Approximate folder layout:

```text
.
├─ services/
│  ├─ auth-service/
│  │  └─ index.js
│  ├─ habit-data-service/
│  │  └─ index.js
│  ├─ habit-stats-service/
│  │  └─ index.js
│  ├─ quote-adapter-service/
│  │  └─ index.js
│  └─ gateway-service/
│     └─ index.js
├─ cli/
│  └─ index.js
├─ docs/
│  └─ openapi.json          # OpenAPI spec used by Swagger UI
├─ db/                      # SQLite database (local dev, optional – Docker uses a volume)
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
└─ README.md
````
