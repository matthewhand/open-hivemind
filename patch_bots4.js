const fs = require('fs');

function extractAndPatch(content) {
  // We need to inject the import
  if (!content.includes('useOptimisticList')) {
    content = content.replace("import React, { useState, useEffect, useCallback, useMemo } from 'react';",
      "import React, { useState, useEffect, useCallback, useMemo } from 'react';\nimport { useOptimisticList } from '../hooks/useOptimisticList';");
  }

  // Replace const [bots, setBots] = useState<BotConfig[]>([]);
  content = content.replace(
    /const \[bots, setBots\] = useState<BotConfig\[\]>\(\[\]\);/,
    "const { items: bots, setItems: setBots, isUpdating, executeOptimistic } = useOptimisticList<BotConfig>([]);"
  );

  // Patch handleCreateBot
  content = content.replace(
    /const handleCreateBot = async \(botData: any\) => \{[\s\S]*?toast\.error\(err instanceof Error \? err\.message : 'Failed to create bot'\);\s*\}\s*\};/,
    `const handleCreateBot = async (botData: any) => {
    const tempId = 'temp-' + Date.now();
    const optimisticBot = { ...botData, id: tempId, status: 'active', connected: false, messageCount: 0, errorCount: 0 };

    setIsCreateModalOpen(false);

    await executeOptimistic({
      type: 'create',
      optimisticItem: optimisticBot,
      apiCall: () => apiService.post<any>('/api/bots', botData),
      successMessage: 'Bot created successfully',
      rollbackMessage: 'Failed to create bot',
      onError: (err) => {
        setIsCreateModalOpen(true);
        ErrorService.report(err, { action: 'createBot', botData });
      }
    });
  };`
  );

  // Patch handleUpdateBot
  content = content.replace(
    /const handleUpdateBot = async \(botData: any\) => \{[\s\S]*?toast\.error\(err instanceof Error \? err\.message : 'Failed to update bot'\);\s*\}\s*\};/,
    `const handleUpdateBot = async (botData: any) => {
    const currentBotId = editingBot?.id;
    if (!currentBotId) return;

    const originalBot = bots.find(b => b.id === currentBotId);
    if (!originalBot) return;

    const optimisticBot = { ...originalBot, ...botData };
    setEditingBot(null);

    await executeOptimistic({
      type: 'update',
      optimisticItem: optimisticBot,
      originalItem: originalBot,
      apiCall: () => apiService.put<any>(\`/api/bots/\${currentBotId}\`, botData),
      successMessage: 'Bot updated successfully',
      rollbackMessage: 'Failed to update bot',
      onSuccess: (res) => {
        if (previewBot?.id === currentBotId) {
          setPreviewBot(res.data.bot);
        }
      },
      onError: (err) => {
        setEditingBot(originalBot);
        ErrorService.report(err, { action: 'updateBot', botId: currentBotId });
      }
    });
  };`
  );

  // Patch handleDeleteBot
  content = content.replace(
    /const handleDeleteBot = React\.useCallback\(async \(\) => \{[\s\S]*?toast\.error\(err instanceof Error \? err\.message : 'Failed to delete bot'\);\s*\}\s*\}, \[deletingBot, bots, previewBot, toast\]\);/,
    `const handleDeleteBot = React.useCallback(async () => {
    if (!deletingBot) return;
    const botId = deletingBot.id;
    const originalBot = bots.find(b => b.id === botId);
    if (!originalBot) return;

    const wasPreviewed = previewBot?.id === botId;
    if (wasPreviewed) setPreviewBot(null);
    setDeletingBot(null);

    await executeOptimistic({
      type: 'delete',
      optimisticItem: originalBot, // Using original as target ID holder
      originalItem: originalBot,
      apiCall: () => apiService.delete(\`/api/bots/\${botId}\`),
      successMessage: 'Bot deleted successfully',
      rollbackMessage: 'Failed to delete bot',
      onError: (err) => {
        if (wasPreviewed) setPreviewBot(originalBot);
        ErrorService.report(err, { action: 'deleteBot', botId });
      }
    });
  }, [deletingBot, bots, previewBot, toast, executeOptimistic]);`
  );

  // Patch handleToggleBotStatus
  content = content.replace(
    /const handleToggleBotStatus = async \(bot: BotConfig\) => \{[\s\S]*?toast\.error\(err instanceof Error \? err\.message : 'Failed to update bot status'\);\s*\}\s*\};/,
    `const handleToggleBotStatus = async (bot: BotConfig) => {
    const originalStatus = bot.status;
    const newStatus = originalStatus === 'active' ? 'inactive' : 'active';
    const optimisticBot = { ...bot, status: newStatus };

    if (previewBot?.id === bot.id) {
      setPreviewBot(prev => prev ? { ...prev, status: newStatus } : null);
    }

    await executeOptimistic({
      type: 'update',
      optimisticItem: optimisticBot,
      originalItem: bot,
      apiCall: () => apiService.patch<any>(\`/api/bots/\${bot.id}/status\`, { status: newStatus }),
      successMessage: \`Bot \${newStatus === 'active' ? 'activated' : 'deactivated'} successfully\`,
      rollbackMessage: 'Failed to update bot status',
      onError: (err) => {
        if (previewBot?.id === bot.id) {
          setPreviewBot(prev => prev ? { ...prev, status: originalStatus } : null);
        }
        ErrorService.report(err, { action: 'toggleBotStatus', botId: bot.id });
      }
    });
  };`
  );

  // Pass isUpdating flag to BotCard
  // We need to replace onToggleStatus={() => handleToggleBotStatus(bot)}
  // with onToggleStatus={() => handleToggleBotStatus(bot)} isUpdating={isUpdating(bot.id)}
  // if BotCard supports it. Since we just saw the PR comment requested disabling,
  // we will pass the isUpdating prop.
  content = content.replace(
    /<BotCard\s*key=\{bot\.id\}\s*bot=\{bot\}/g,
    "<BotCard key={bot.id} bot={bot} isUpdating={isUpdating(bot.id)}"
  );

  return content;
}

const content = fs.readFileSync('src/client/src/pages/BotsPage.tsx', 'utf8');
const patched = extractAndPatch(content);
fs.writeFileSync('src/client/src/pages/BotsPage.tsx', patched);
