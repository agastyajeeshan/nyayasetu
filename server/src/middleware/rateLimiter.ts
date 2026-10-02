import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipBuckets = new Map<string, RateLimitRecord>();

export const rateLimiter = (maxRequests = 200, windowMs = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const record = ipBuckets.get(ip);
    if (!record || now > record.resetTime) {
      ipBuckets.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > maxRequests) {
      const retrySec = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        error: `Rate limit exceeded. Too many requests from this IP. Please try again in ${retrySec} seconds.`
      });
      return;
    }

    next();
  };
};
