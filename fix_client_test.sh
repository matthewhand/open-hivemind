#!/bin/bash
sed -i 's/import { MemoryRouter } from '\''react-router-dom\'';/import { MemoryRouter } from '\''react-router-dom\'';\nimport { WebSocketProvider } from '\''..\/contexts\/WebSocketContext\'';/' src/client/src/pages/__tests__/ActivityPage.test.tsx
sed -i 's/<MemoryRouter><ActivityPage \/><\/MemoryRouter>/<WebSocketProvider><MemoryRouter><ActivityPage \/><\/MemoryRouter><\/WebSocketProvider>/' src/client/src/pages/__tests__/ActivityPage.test.tsx
sed -i 's/<MemoryRouter>/<WebSocketProvider>\n          <MemoryRouter>/' src/client/src/pages/__tests__/ActivityPage.test.tsx
sed -i 's/<\/MemoryRouter>/<\/MemoryRouter>\n        <\/WebSocketProvider>/' src/client/src/pages/__tests__/ActivityPage.test.tsx
