import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';

let app: express.Application | null = null;

const initializeApp = async (): Promise<express.Application> => {
  if (app) {
    return app;
  }

  // Set production environment
  process.env.NODE_ENV = 'production';

  // Import the main application
  const mainApp = require('../../dist/src/index.js');

  app = express();

  // Add CORS middleware
  app.use(cors({
    origin: ['https://open-hivemind.vercel.app', 'https://open-hivemind-matthewhands-projects.vercel.app'],
    credentials: true
  }));

  // Proxy to the main application
  app.use('/', mainApp.default || mainApp);

  return app;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await initializeApp();

    // Handle the request
    app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}