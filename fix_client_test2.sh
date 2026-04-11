#!/bin/bash
# First revert the previous script's modifications since they didn't quite work
git checkout src/client/src/pages/__tests__/ActivityPage.test.tsx

# Create a more robust script to fix the import and the render calls
sed -i "s/import { MemoryRouter } from 'react-router-dom';/import { MemoryRouter } from 'react-router-dom';\nimport { WebSocketProvider } from '..\/..\/contexts\/WebSocketContext';/g" src/client/src/pages/__tests__/ActivityPage.test.tsx

# Fix single line renders
sed -i 's/<MemoryRouter><ActivityPage \/><\/MemoryRouter>/<WebSocketProvider><MemoryRouter><ActivityPage \/><\/MemoryRouter><\/WebSocketProvider>/g' src/client/src/pages/__tests__/ActivityPage.test.tsx

# Fix multi-line renders
sed -i 's/<MemoryRouter>/<WebSocketProvider><MemoryRouter>/g' src/client/src/pages/__tests__/ActivityPage.test.tsx
sed -i 's/<\/MemoryRouter>/<\/MemoryRouter><\/WebSocketProvider>/g' src/client/src/pages/__tests__/ActivityPage.test.tsx

# Because we did the single-line renders twice with the regexes above, we need to clean them up
sed -i 's/<WebSocketProvider><WebSocketProvider><MemoryRouter><ActivityPage \/><\/MemoryRouter><\/WebSocketProvider><\/WebSocketProvider>/<WebSocketProvider><MemoryRouter><ActivityPage \/><\/MemoryRouter><\/WebSocketProvider>/g' src/client/src/pages/__tests__/ActivityPage.test.tsx
