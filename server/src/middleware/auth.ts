import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    agencyId: string;
    name: string;
    email: string;
    role: UserRole;
    department: string;
    organization: string;
    jurisdiction: string;
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedRequest['user'];
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }
};

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (req.user.role === 'admin') {
      // System administrator has system-level access
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access Forbidden: Role '${req.user.role}' is not authorized to perform this action. Required: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};
