with open('src/client/src/components/__tests__/UnifiedDashboard.test.tsx', 'r') as f:
    content = f.read()

content = "import { expect, vi } from 'vitest';\n" + content.replace("import { vi } from 'vitest';", "")

content = content.replace(
    '  StatsCards: () => <div className="stats-cards">Stats</div>,',
    '  StatsCards: (props: any) => (\n    <div className="stats-cards" data-testid="stats-cards">\n      {JSON.stringify(props.stats)}\n    </div>\n  ),'
)

test_code = """
  it('correctly calculates derived statistics from status bots', async () => {
    const mockBots = [
      { name: 'Bot1', messageProvider: 'discord', llmProvider: 'openai' },
      { name: 'Bot2', messageProvider: 'slack', llmProvider: 'anthropic' },
    ];
    (apiService.getConfig as any).mockResolvedValue({
      bots: mockBots,
      warnings: [],
      environment: 'development',
    });

    // Status mock returns 2 active bots, 1 connected, 150 messages total, 5 errors total
    (apiService.getStatus as any).mockResolvedValue({
      bots: [
        { name: 'Bot1', status: 'active', connected: true, messageCount: 100, errorCount: 2 },
        { name: 'Bot2', status: 'active', connected: false, messageCount: 50, errorCount: 3 },
        { name: 'Bot3', status: 'inactive', connected: false, messageCount: 0, errorCount: 0 },
      ],
      uptime: 100,
    });
    (apiService.getPersonas as any).mockResolvedValue([]);
    (apiService.getLlmProfiles as any).mockResolvedValue({ profiles: { llm: [] } });

    render(
      <BrowserRouter>
        <UnifiedDashboard />
      </BrowserRouter>
    );

    // Wait for the StatsCards component to render the stats props
    await waitFor(() => {
      const statsCards = screen.getByTestId('stats-cards');
      expect(statsCards.textContent).toContain('Active Bots');
    });

    const statsText = screen.getByTestId('stats-cards').textContent || '';
    const statsData = JSON.parse(statsText);

    // Check if the parsed statsData contains the objects we expect
    const activeBots = statsData.find((s: any) => s.title === 'Active Bots');
    expect(activeBots).toBeDefined();
    expect(activeBots.value).toBe(2);

    const totalMessages = statsData.find((s: any) => s.title === 'Total Messages' || s.title === 'Messages Today');
    expect(totalMessages).toBeDefined();
    expect(totalMessages.value).toBe(150);

    const errorRate = statsData.find((s: any) => s.title === 'Error Rate');
    expect(errorRate).toBeDefined();
    expect(errorRate.value).toBe('3.33%');
  });
"""

content = content.rsplit('\n', 2)[0] + '\n' + test_code + '\n});\n'

with open('src/client/src/components/__tests__/UnifiedDashboard.test.tsx', 'w') as f:
    f.write(content)
