# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

# Project Overview

## SalesPilot

SalesPilot is an AI-powered Sales Engineer platform that helps businesses design cost-optimized cloud architectures.

The system collects business requirements through an AI conversation, validates missing information, generates cloud architectures, estimates pricing using live cloud provider APIs (Azure, AWS, GCP), recommends optimizations, and creates proposal-ready documentation.

Primary users:
- Sales Engineers
- Solution Architects
- Cloud Consultants
- Pre-Sales Teams

---

# Core Workflow

1. User starts a new solution.
2. AI Requirement Agent interviews the customer.
3. Missing information is requested automatically.
4. Requirements are structured into a standardized JSON format.
5. Architecture Generator creates a cloud solution.
6. Pricing Engine fetches live pricing from cloud provider APIs.
7. Cost Optimizer suggests cheaper alternatives.
8. AI negotiates trade-offs (cost vs performance vs availability).
9. Proposal Generator creates architecture diagrams, BOM, pricing, and documentation.
10. User exports the final proposal.

---

# Planned AI Agents

- Requirement Collection Agent
- Requirement Validation Agent
- Architecture Generator
- Pricing Agent
- Cost Optimization Agent
- Proposal Generator
- Follow-up Agent

---

# Tech Stack

Frontend:


Backend:


Database:


Authentication:


AI:


Cloud Pricing APIs:
- Azure Retail Prices API
- AWS Pricing API
- Google Cloud Billing Catalog API

Storage:


---

# Branch Structure

- main — production
- A — feature branch
- B — feature branch
- C — current working branch
- D — feature branch

---

# Current Status

Project is in the initial setup phase.

Current repository contains only the README.

Project structure will be added incrementally.

---

# Development Guidelines

- Keep commits focused and atomic.
- Reference issue numbers when applicable.
- Test locally before pushing.
- Keep pull requests small.
- Update documentation when changing architecture.

---

# Build & Development

(To be completed after project scaffolding.)

Include:

- dependency installation
- development server
- production build
- environment variables

---

# Testing

(To be completed.)

Include:

- unit tests
- integration tests
- linting
- formatting
- type checking

---

# Code Structure

(To be completed.)

Document:

- frontend architecture
- backend architecture
- API structure
- database schema
- shared types
- coding conventions

---

# Future Notes

Watch for:

- Configuration management
- Database schema
- API documentation
- CI/CD pipeline
- Deployment strategy