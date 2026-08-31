import type { Request, Response } from 'express';
import * as farmerEducationService from './farmerEducation.service';

// --- Cultivation guides ---

export async function createCultivationGuide(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.createCultivationGuide(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Cultivation guide created' });
}

export async function publishCultivationGuide(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.publishCultivationGuide(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Cultivation guide published' });
}

export async function listCultivationGuides(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.listCultivationGuides({
    crop: req.query.crop as string | undefined,
    variety: req.query.variety as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Video tutorials ---

export async function createVideoTutorial(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.createVideoTutorial(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Video tutorial added' });
}

export async function publishVideoTutorial(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.publishVideoTutorial(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Video tutorial published' });
}

export async function listVideoTutorials(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.listVideoTutorials({
    crop: req.query.crop as string | undefined,
    variety: req.query.variety as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Disease guides ---

export async function createDiseaseGuide(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.createDiseaseGuide(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Disease guide created' });
}

export async function publishDiseaseGuide(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.publishDiseaseGuide(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Disease guide published' });
}

export async function listDiseaseGuides(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.listDiseaseGuides({
    crop: req.query.crop as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

// --- Success stories ---

export async function createSuccessStory(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.createSuccessStory(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Success story curated' });
}

export async function listSuccessStories(req: Request, res: Response): Promise<void> {
  const featuredParam = req.query.featured as string | undefined;
  const data = await farmerEducationService.listSuccessStories({
    crop: req.query.crop as string | undefined,
    variety: req.query.variety as string | undefined,
    featured: featuredParam !== undefined ? featuredParam === 'true' : undefined,
  });
  res.json({ success: true, data });
}

// --- Q&A forum ---

export async function askQuestion(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.askQuestion(req.body, req.user!);
  res.status(201).json({ success: true, data, message: 'Question submitted' });
}

export async function answerQuestion(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.answerQuestion(req.params.id, req.body?.answerText, req.user!);
  res.status(201).json({ success: true, data, message: 'Answer posted' });
}

export async function closeQuestion(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.closeQuestion(req.params.id, req.user!);
  res.json({ success: true, data, message: 'Question closed' });
}

export async function listQuestions(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.listQuestions({
    crop: req.query.crop as string | undefined,
    variety: req.query.variety as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data });
}

export async function getQuestionWithAnswers(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.getQuestionWithAnswers(req.params.id);
  res.json({ success: true, data });
}

// --- Advisory bundle ---

export async function getAdvisoryBundle(req: Request, res: Response): Promise<void> {
  const data = await farmerEducationService.getAdvisoryBundle(req.query.crop as string, req.query.variety as string | undefined);
  res.json({ success: true, data });
}
