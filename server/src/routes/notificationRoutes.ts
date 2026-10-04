import { Router, Response } from 'express';
import { NotificationService } from '../services/notificationService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get notifications for authenticated user
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await NotificationService.getNotifications(req.user!.id, req.user!.role);
    const unreadCount = await NotificationService.getUnreadCount(req.user!.id, req.user!.role);
    res.json({ notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark single notification as read
router.patch('/:id/read', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await NotificationService.markAsRead(req.params.id as string);
    if (!success) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
router.post('/read-all', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await NotificationService.markAllAsRead(req.user!.id, req.user!.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
