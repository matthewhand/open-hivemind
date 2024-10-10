import express from 'express';
import healthRoute from './routes/health';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

const app = express();

// Use individual routes
app.use(healthRoute);

// Use PORT from environment variables or fallback to 5005
const port = process.env.PORT || 5005;
app.listen(port, () => {
  console.log();
});
