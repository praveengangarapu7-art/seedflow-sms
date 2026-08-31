import type { Request, Response } from 'express';
import * as assistantService from './assistant.service';

export async function ask(req: Request, res: Response): Promise<void> {
  const data = await assistantService.askAssistant(
    { question: req.body?.question, currentPath: typeof req.body?.currentPath === 'string' ? req.body.currentPath : undefined },
    req.user!,
  );
  res.json({ success: true, data });
}

export async function status(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: assistantService.assistantStatus() });
}
