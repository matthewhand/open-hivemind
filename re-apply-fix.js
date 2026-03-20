const fs = require('fs');

// We need to re-apply the refactoring to UnifiedDashboard.tsx because `git clean -fd` followed by `git reset --hard` wiped it out before the commit!

let ud = fs.readFileSync('src/client/src/components/UnifiedDashboard.tsx', 'utf-8');

// 1. Imports
const imports = `import { GettingStartedTab } from './Dashboard/tabs/GettingStartedTab';
import { StatusTab } from './Dashboard/tabs/StatusTab';
import { PerformanceTab } from './Dashboard/tabs/PerformanceTab';
import { usePerformanceMetrics } from './Dashboard/hooks/usePerformanceMetrics';
import { useDashboardStats } from './Dashboard/hooks/useDashboardStats';
import { DashboardHeader } from './Dashboard/DashboardHeader';
import { DashboardTabs } from './Dashboard/DashboardTabs';
import { getBotColumns } from './Dashboard/utils/getBotColumns';
import { useNavigate } from 'react-router-dom';`;

ud = ud.replace("import { PlusCircle, RefreshCw, LayoutDashboard, Cpu, HardDrive, Gauge, Clock, Activity, Info, Rocket } from 'lucide-react';", "import { Info } from 'lucide-react';\n" + imports);
ud = ud.replace("/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */", "/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports */");

// 2. Constants and definitions
ud = ud.replace("interface BotTableRow {", "export interface BotTableRow {");
ud = ud.replace("const UnifiedDashboard: React.FC = () => {", "const UnifiedDashboard: React.FC = () => {\n  const navigate = useNavigate();");

// 3. Remove inline helpers
ud = ud.replace(/const getStatusBadgeVariant = \([\s\S]*?return 'neutral';\n  }\n};\n/g, "");
ud = ud.replace(/const getProviderEmoji = \([\s\S]*?return '🔌';\n  }\n};\n/g, "");
ud = ud.replace("const buildLastActivityLabel = (messageCount: number | undefined, connected: boolean | undefined) => {", "export const buildLastActivityLabel = (messageCount: number | undefined, connected: boolean | undefined) => {");
ud = ud.replace(/const formatUptime = \([\s\S]*?return `${String\(h\).padStart\(2, '0'\)}h ${String\(m\).padStart\(2, '0'\)}m`;\n};\n/g, "");


// 4. Hooks
const hookRegex1 = /const errorRatePercent = [\s\S]*?\],\n    \[activeBotCount, bots.length, totalMessages, activeConnections, errorRatePercent, totalErrors, uptimeDisplay\],\n  \);/;
ud = ud.replace(hookRegex1, `const { statsCards } = useDashboardStats(
    bots,
    statusBots,
    activeBotCount,
    totalMessages,
    activeConnections,
    totalErrors,
    status?.uptime ?? 0
  );`);

const hookRegex2 = /const performanceMetrics = [\s\S]*?\],\n    \[performanceMetrics, bots.length, activeConnections\],\n  \);/;
ud = ud.replace(hookRegex2, `const { performanceMetrics, performanceCards } = usePerformanceMetrics(
    bots,
    activeConnections,
    totalMessages,
    totalErrors
  );`);

const hookRegex3 = /const botColumns = useMemo\([\s\S]*?\],\n    \[\],\n  \);/;
ud = ud.replace(hookRegex3, "const botColumns = useMemo(() => getBotColumns(), []);");

ud = ud.replace(/const createBotFields = useMemo\([\s\S]*?\],\n    \[\],\n  \);/, "");
ud = ud.replace(/const createBotSteps = useMemo\([\s\S]*?\],\n    \[\],\n  \);/, "");

// 5. Render
const renderRegex = /<div className="bg-gradient-to-r[\s\S]*?<\/div>\n      <\/div>/;
ud = ud.replace(renderRegex, `<DashboardHeader
        handleOpenCreateModal={handleOpenCreateModal}
        isModalDataLoading={isModalDataLoading}
        handleRefresh={handleRefresh}
        refreshing={refreshing}
      />`);

const renderRegex2 = /<div\n        role="tablist"[\s\S]*?<\/div>\n\n      \{loading \? \(/;
ud = ud.replace(renderRegex2, `<DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />\n\n      {loading ? (`);

const renderRegex3 = /<section\s+id="dashboard-panel-getting-started"[\s\S]*?<\/section>\s*<section\s+id="dashboard-panel-status"[\s\S]*?<\/section>\s*<section\s+id="dashboard-panel-performance"[\s\S]*?<\/section>/;
const newRender = `          <GettingStartedTab
            activeTab={activeTab}
            bots={bots}
            systemMetrics={systemMetrics}
            setShowCreateWizard={setShowCreateWizard}
            navigate={navigate}
          />
          <StatusTab
            activeTab={activeTab}
            error={error}
            setError={setError}
            warnings={warnings}
            statsCards={statsCards}
            loading={loading}
            environment={environment}
            version={systemVersion}
            bots={botTableData}
            columns={botColumns}
            handleRefresh={handleRefresh}
            guardedBots={guardedBots}
            activeConnections={activeConnections}
            totalBots={bots.length}
            ownerGuards={bots.filter(bot => bot.mcpGuard?.type === 'owner').length}
          />
          <PerformanceTab
            activeTab={activeTab}
            performanceCards={performanceCards}
            performanceMetrics={performanceMetrics}
            statusBots={statusBots}
            bots={bots}
          />`;
ud = ud.replace(renderRegex3, newRender);

fs.writeFileSync('src/client/src/components/UnifiedDashboard.tsx', ud);
