# 🥬 Grocerly Documentation System

Welcome to the comprehensive, production-grade documentation system for **Grocerly** — an enterprise-grade full-stack online grocery platform built with Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Mongoose (MongoDB), Nodemailer, and Pino.

This documentation system is grounded strictly in the verified source code, automated test suites, and database models of the repository.

---

## 📑 Documentation Index

| Document | Identifier | Description | Audience |
| :--- | :--- | :--- | :--- |
| [Product & Software Requirements](requirements.md) | `DOC-REQ` | Functional requirements, business rules, user journeys, and requirements traceability matrix. | Product, Dev, QA |
| [System Architecture](architecture.md) | `DOC-ARCH` | High-level system topology, layered architecture, component boundaries, and technology stack. | Architects, DevSecOps |
| [Architecture Decision Records (ADRs)](architecture-decision-records.md) | `DOC-ADR` | Eight authoritative ADRs documenting key technical choices, alternatives, and trade-offs. | Architects, Leads |
| [Data Flows & Sequence Diagrams](data-flow-and-sequences.md) | `DOC-FLOW` | Mermaid sequence diagrams for authentication, OTP lifecycle, checkout, payments, and order fulfillment. | Dev, QA |
| [API Specification & Reference](api-reference.md) | `DOC-API` | Comprehensive REST endpoint catalog, request/response contracts, status codes, and rate limits. | Backend, Frontend, Integrators |
| [OpenAPI 3.1 Specification](openapi.yaml) | `DOC-OAS` | Machine-readable OpenAPI 3.1 definition for all 40+ REST API endpoints. | Tooling, Swagger, Postman |
| [Database Schema & Data Guide](database.md) | `DOC-DB` | Mongoose models, collection schemas, relationships, indexes (unique, compound, TTL), and migrations. | Backend, DBA |
| [Authentication & Authorization](authentication-and-authorization.md) | `DOC-AUTH` | Bcrypt/Scrypt hashing, HMAC-SHA256 sessions, OTP challenge lifecycle, and Role-Based Access Control (RBAC). | Security, Backend |
| [Security Architecture & Threat Model](security-and-threat-model.md) | `DOC-SEC` | STRIDE threat model, CSRF mitigations, rate limiting, NoSQL sanitization, and credential redaction. | DevSecOps, Compliance |
| [Testing Strategy & Verification](testing.md) | `DOC-TEST` | Native Node.js test runner suite (53 passing tests), test coverage, execution commands, and test doubles. | QA, Dev |
| [Local Development Guide](local-development.md) | `DOC-DEV` | Prerequisites, environment variable configuration, MongoDB setup, database seeding, and running the app. | Developers, Onboarding |
| [Deployment & CI/CD Guide](deployment-and-cicd.md) | `DOC-DEP` | Production deployment options (Standalone Node.js, Docker, Vercel), build pipeline, and containerization. | DevOps, SRE |
| [Observability & Monitoring](observability.md) | `DOC-OBS` | Pino structured JSON logging, credential redaction policy, `/api/health`, `/api/ready` probes, and alerting rules. | SRE, Ops |
| [Disaster Recovery & Backup](disaster-recovery.md) | `DOC-DR` | Database snapshot backup/restore procedures, verified automated tests, rollback playbooks, and recovery targets. | SRE, DBA |
| [Troubleshooting & Incident Response](troubleshooting-and-incident-response.md) | `DOC-TSHOOT`| Step-by-step incident playbooks for database disconnection, SMTP outages, high-rate abuse, and order race conditions. | Support, On-call |
| [User & Administrator Guides](user-and-admin-guide.md) | `DOC-GUIDE` | Customer storefront walkthrough (meal planner, cart, tracking) and Operations/Admin console manuals. | End Users, Staff, Ops |
| [Contributing & Release Process](contributing-and-release.md) | `DOC-REL` | Branching strategy, pull request criteria, semantic versioning, and pre-release verification checklist. | Contributors, Maintainers |
| [Technical Debt & Roadmap](technical-debt-and-roadmap.md) | `DOC-DEBT` | Current upstream CVE mitigations, unconfigured external blockers (SMTP, Razorpay), and future milestones. | Engineering Leads |

---

## ⚡ Quick System Overview

- **Framework**: Next.js `14.2.15` (App Router) with React `18.3.1` and TypeScript `5.6.3`
- **Database**: MongoDB via Mongoose `8.7.0` (10 persistent collections with strict indexing)
- **Security**: Passwords hashed with Bcrypt (salt rounds 12) & Scrypt fallback; sessions signed via HMAC-SHA256 stored in MongoDB with HttpOnly cookies; single-use OTPs stored as HMAC-SHA256 digests.
- **Financial Precision**: 100% integer-paise pricing calculations eliminating floating-point rounding drift.
- **Fulfillment**: Strict 9-state order finite state machine (`ORDER_TRANSITIONS`) preventing illegal state transitions.
- **Test Suite**: 53 automated tests across `tests/commerce.test.mjs`, `tests/production-suite.test.mjs`, and `tests/acceptance.test.mjs` with 100% pass rate.
