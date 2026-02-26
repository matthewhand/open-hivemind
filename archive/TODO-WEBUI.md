### **Phase 1: Scaffolding and Core Layout**
- [ ] **Project Setup:**
    - [X] Install `react-admin` and related dependencies (`ra-data-fakerest`, etc.).
    - [ ] Set up basic folder structure for the new UI components (`/dashboard`, `/admin`).
- [ ] **Routing:**
    - [X] Configure `AppRouter.tsx` to handle the main `/` route and the `/admin` section.
    - [ ] Create a protected route component to secure the `/admin` section.
- [ ] **Core Layout:**
    - [ ] Create a main layout component with a persistent sidebar for navigation.
    - [ ] Create placeholder pages for the `Dashboard` (`/`) and `Admin` (`/admin`) sections.

### **Phase 2: The Unified Dashboard (`/`)**
- [ ] **Agent Control Center:**
    - [ ] Create an `AgentCard` component to display individual agent information (name, status, metrics).
    *   [ ] Create an `AgentGrid` component to display a collection of `AgentCard` components.
    - [ ] Implement the "Start/Stop" toggle functionality.
    - [ ] Implement the "View Details" modal or expandable section.
- [ ] **System-Wide Analytics:**
    - [ ] Integrate a charting library (e.g., Recharts).
    - [ ] Create a `MessageVolumeChart` component.
    - [ ] Create an `LLMUsageChart` component.
- [ ] **Global Activity Feed:**
    - [ ] Create an `ActivityLog` component to display real-time events.
    - [ ] Connect the component to the WebSocket service for live updates.

### **Phase 3: The Admin Section (`/admin`)**
- [ ] **Agent Management (`/admin/agents`):**
    - [ ] Create an `AgentTable` component to display a list of all agents with CRUD actions.
    - [ ] Implement the "Delete Agent" functionality with a confirmation dialog.
- [ ] **Agent Creation/Editing (`/admin/agents/create`, `/admin/agents/:id/edit`):**
    - [ ] Create an `AgentForm` component for creating and editing agents.
    - [ ] Add dropdowns for selecting message and LLM providers.
    - [ ] Implement the "Add/Remove Connection" functionality.
- [ ] **Settings (`/admin/settings`):**
    - [ ] Create a `ProviderSettings` component to manage provider API keys.
    - [ ] Create a `GlobalSettings` component for other application settings.

### **Phase 4: Authentication & API Integration**
- [ ] **Authentication:**
    - [ ] Create a `LoginPage` component.
    - [ ] Implement the login/logout flow using the authentication middleware.
    - [ ] Store authentication tokens securely.
- [ ] **API Integration:**
    - [ ] Connect the UI components to the backend APIs for fetching and updating data.
    - [ ] Use Redux Toolkit and RTK Query for state management and data fetching.
    - [ ] Implement error handling for API requests.

### **Phase 5: Final Touches**
- [ ] **Styling and Theming:**
    - [ ] Ensure all components are styled according to Material Design principles.
    - [ ] Implement a dark mode theme.
    - [ ] Ensure the UI is fully responsive.
- [ ] **Testing:**
    - [ ] Write unit tests for all new components.
    - [ ] Write integration tests for the main user flows (e.g., creating an agent, logging in).
- [ ] **Documentation:**
    - [X] Update `README.md` with the new UI concept.
    - [ ] Create a `WEBUI_GUIDE.md` with detailed instructions on how to use the new web UI.