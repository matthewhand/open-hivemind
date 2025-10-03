import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server for node environment
export const server = setupServer(...handlers);