import { Router, Response } from 'express';
import { SemanticSearchService } from '../services/semanticSearchService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Semantic and Hybrid Natural Language Search
router.get('/semantic', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, type, jurisdiction, section } = req.query as Record<string, string>;

    if (!q) {
      res.json([]);
      return;
    }

    const results = await SemanticSearchService.search(q, {
      resourceType: type as any,
      jurisdiction,
      sectionFilter: section
    });

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
