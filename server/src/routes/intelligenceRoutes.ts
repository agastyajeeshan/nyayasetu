import { Router, Response } from 'express';
import { IntelligenceService } from '../services/intelligenceService.js';
import { AIService } from '../services/aiService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get multi-case cross-document correlations
router.get('/correlations', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const correlations = await IntelligenceService.getCorrelations();
    res.json(correlations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get interactive knowledge graph for link analysis
router.get('/graph', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.query as { caseId?: string };
    const graph = await IntelligenceService.getKnowledgeGraph(caseId);
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get cross-document discrepancy and contradiction reports
router.get('/discrepancies', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.query as { caseId?: string };
    const discrepancies = await IntelligenceService.getDiscrepancies(caseId);
    res.json(discrepancies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Case Assistant: Charge Sheet Readiness
router.get('/charge-sheet-readiness/:caseId', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const report = await AIService.evaluateChargeSheetReadiness(req.params.caseId as string);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Case Assistant: Interactive Chat Copilot
router.post('/chat-assistant', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query, caseId } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Query is required for AI Case Assistant.' });
      return;
    }
    const result = await AIService.chatAssistant(query, caseId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
