import { Router, Response } from 'express';
import { SemanticSearchService } from '../services/semanticSearchService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Semantic and Hybrid Natural Language Search
router.get('/semantic', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { q, type, jurisdiction, section } = req.query as Record<string, string>;

  if (!q) {
    res.json([]);
    return;
  }

  const results = SemanticSearchService.search(q, {
    resourceType: type as any,
    jurisdiction,
    sectionFilter: section
  });

  res.json(results);
});

export default router;
