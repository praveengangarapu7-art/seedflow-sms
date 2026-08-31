import type { Request, Response } from 'express';
import * as reconciliationService from './reconciliation.service';

export async function reconcile(_req: Request, res: Response): Promise<void> {
  const data = await reconciliationService.runReconciliation();
  res.json({ success: true, data, message: `${data.issueCount} issue(s) found across ${data.totalChecked} record(s)` });
}
