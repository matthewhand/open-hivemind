import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import crypto from 'crypto';

// Session middleware configuration
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const sessionConfig: session.SessionOptions = {
    secret: SESSION_SECRET,
    name: 'hivemind.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    }
};

// Create session middleware
export const sessionMiddleware = session(sessionConfig);

// Apply session management middleware
export const applySessionManagement = (req: Request, res: Response, next: NextFunction) => {
    sessionMiddleware(req, res, next);
};

export default sessionMiddleware;
