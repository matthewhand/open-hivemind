# 🚀 Open-Hivemind TODO

## 🎨 DaisyUI WebUI Transformation

### Phase 1: Setup & Infrastructure
- [x] Install DaisyUI + TailwindCSS
- [x] Configure Tailwind with DaisyUI themes
- [x] Create design system documentation

### Phase 2: Core DaisyUI Components
- [x] Drawer Navigation System
- [x] Stats Cards Dashboard
- [x] Table with Pagination & Filtering
- [x] Toast Notification System
- [x] Modal Forms & Configuration
- [x] All 63 DaisyUI component features

### Phase 3: Advanced Features
- [x] Theme Switcher (multiple DaisyUI themes)
- [x] Component Library (reusable system)
- [x] Animation System (transitions, micro-interactions)
- [x] Mobile-First Design
- [x] Accessibility (ARIA, keyboard navigation)
- [x] Density toggle (compact / comfortable / spacious) persisted in store

---

## 🎯 React WebUI Configuration System

### Phase 1: Core Infrastructure
- [x] React App Setup (Vite + React + TypeScript)
- [x] Backend API Endpoints (`/api/config`, `/api/bots`, `/api/status`)
- [x] Configuration Reader Service (merge env + files, mask secrets)
- [x] Dashboard Overview (bot cards, health indicators, stats)
- [x] Configuration Viewer (tree view, source indicators, search)

### Phase 2: Live Configuration Management
- [x] Secure Configuration Storage (`config/user/` gitignored)
- [x] User Authentication (JWT, RBAC)
- [x] Bot Instance Manager (add/remove/clone bots)
- [x] Platform Configuration (Discord/Slack/Mattermost setup)

### Phase 3: Advanced Features
- [x] Hot Reload System (no-restart config changes)
- [x] Configuration Wizard (step-by-step setup)
- [x] Real-Time Monitoring (message flow, metrics, errors)
- [x] Configuration Analytics (usage stats, optimization)

### Phase 4: Enterprise Features
- [x] Environment Management (dev/staging/prod configs)
- [ ] Team Collaboration (multi-user, approvals, audit)
- [x] CI/CD Integration (validation, deployment, drift detection)
- [x] Backup & Recovery (automated backups, point-in-time recovery)

---

## 🔒 Security
- [ ] Never commit sensitive data to git
- [x] Encrypt config files at rest
- [x] Comprehensive audit logging
- [x] IP-based access restrictions
- [x] Role-based access control (RBAC)

---

## 🗄️ Database Layer
- [x] SQLite support
- [x] Postgres support (PostgresWrapper)
- [x] Migration runner (Umzug-based)
- [x] Repository pattern (BotConfig, Message, Activity, Anomaly, Approval, Decision, Inference, Memory)
- [x] Encryption service for sensitive fields
- [x] Fix prettier/TS errors in database layer after upstream pull (2025-05)

---

## 🤖 Bot / DI / Runtime
- [x] tsyringe DI container setup
- [x] Fix DemoModeService DI registration (tsx emitDecoratorMetadata workaround via factory) (2025-05)
- [x] Fix DiscordProvider / SlackProvider namespace-as-type TS errors (2025-05)
- [x] Fix BotManager MCPConfig type (2025-05)
- [x] Fix ApprovalRepository / BotConfigRepository null vs undefined (2025-05)
- [x] Fix ProviderRegistry Function-to-Record cast (2025-05)
- [x] Fix errorLogger process.emit overload errors (2025-05)

---

## 🧪 Testing
- [x] Fix all hanging test suites (WebSocket, AuthManager, Auth middleware, admin routes)
- [x] Fix Jest module mappings for `@integrations/*`
- [x] Create missing utility stubs (`llmProviderUtils`, `messageProviderUtils`)
- [x] Re-enable version-deletion test suite
- [x] 241 tests passing, 2 suites skipped (postgres integration — require live DB)
- [ ] Add E2E coverage for new demo mode flow
- [ ] Break down large security auth test into focused files

---

## 🖥️ WebUI UX / Browser Persistence
- [x] `useLocalStorage` hook exists
- [x] Persist `showAdvanced` toggle — ProviderConfigForm (2025-05)
- [x] Persist `showAdvanced` toggle — PersonaSettingsTab (2025-05)
- [x] Persist `showAdvanced` toggle — MessageProvidersPage SettingsTab (2025-05)
- [x] Persist `showAdvanced` toggle — BotSettingsTab (2025-05)
- [x] Persist `showAdvanced` toggle — GuardSettingsTab (2025-05)
- [x] Persist `showSuggestions` toggle — DaisyUIComponentTracker (2025-05)
- [ ] Persist `isExpanded` — PersonaSelector
- [ ] Persist `expanded` — ApiDocsPage
- [ ] Persist sidebar collapsed state
- [ ] Persist active tab per page (where not already in URL params)

---

## 🐛 Bug Fixes / Infra
- [x] Fix webhookRoutes.ts truncated file (missing closing braces) (2025-05)
- [x] Fix prettier errors — InferenceStage, webhooks, DashboardService, ConnectionManager (2025-05)
- [x] Standardize DemoModeService resolve to string token across initServices, websocket/index, DashboardService, demo routes (2025-05)
- [ ] Team Collaboration (multi-user approvals) — Phase 4 incomplete
- [ ] Date Picker component (native browser fallback preferred)
- [ ] Masked Input component

---

## 📦 Deployment / Docker
- [ ] Multi-stage Docker build (devDeps for build, pruned for runtime)
- [ ] Standardize port (3028) across Dockerfile, compose, docs
- [ ] Fix `cross-env` availability at runtime in Docker
- [ ] Dev workflow: separate Vite port (5173) from backend (3028)
- [ ] Ensure UI shell renders without auth-gated API calls on first paint
