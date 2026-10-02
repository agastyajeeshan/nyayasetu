import { Router, Response } from 'express';
import { IntelligenceService } from '../services/intelligenceService.js';
import { AIService } from '../services/aiService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get multi-case cross-document correlations
router.get('/correlations', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const correlations = IntelligenceService.getCorrelations();
  res.json(correlations);
});

// Get interactive knowledge graph for link analysis
router.get('/graph', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { caseId } = req.query as { caseId?: string };
  const graph = IntelligenceService.getKnowledgeGraph(caseId);
  res.json(graph);
});

// Get cross-document discrepancy and contradiction reports
router.get('/discrepancies', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { caseId } = req.query as { caseId?: string };
  const discrepancies = IntelligenceService.getDiscrepancies(caseId);
  res.json(discrepancies);
});

// AI Case Assistant: Charge Sheet Readiness
router.get('/charge-sheet-readiness/:caseId', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const report = AIService.evaluateChargeSheetReadiness(req.params.caseId as string);
  res.json(report);
});

// AI Case Assistant: Interactive Chat Copilot
router.post('/chat-assistant', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { query, caseId } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Query is required for AI Case Assistant.' });
    return;
  }
  const result = AIService.chatAssistant(query, caseId);
  res.json(result);
});

export default router;
