import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// CORS configuration for the application
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3028',
    'https://trusted-domain.com',
    'https://open-hivemind.vercel.app'
];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, origin);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Pre-configured CORS middleware
export const corsMiddleware = cors(corsOptions);

// Custom CORS middleware that handles rejections properly
export const applyCors = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (!origin) {
        // No origin header, allow the request
        res.setHeader('Access-Control-Allow-Origin', '*');
        return next();
    }

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        return next();
    }

    // Origin not allowed
    return res.status(403).json({ error: 'Forbidden' });
};

export default corsMiddleware;
