import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: {
    apiKey: string;
  };
}

export function apiKeyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API key is required',
    });
    return;
  }

  if (apiKey !== config.apiKey) {
    res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }

  req.user = { apiKey };
  next();
}
