#!/bin/bash
git checkout src/client/src/pages/__tests__/ActivityPage.test.tsx

# Mock useWebSocket at the top
sed -i "s/import { apiService } from '..\/..\/services\/api';/import { apiService } from '..\/..\/services\/api';\n\nvi.mock('..\/..\/hooks\/useWebSocket', () => ({\n  useWebSocket: () => ({\n    socket: null,\n    connected: false,\n    error: null,\n    connect: vi.fn(),\n    disconnect: vi.fn()\n  })\n}));/g" src/client/src/pages/__tests__/ActivityPage.test.tsx
