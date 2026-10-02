import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An internal server error occurred.';

  // In production/government systems, avoid leaking raw stack traces or internal filesystem paths
  console.error(`[SEC-ERROR] ${new Date().toISOString()} [${req.method} ${req.originalUrl}]:`, err.message);

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};
