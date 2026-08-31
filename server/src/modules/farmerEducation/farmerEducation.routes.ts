import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import * as farmerEducationController from './farmerEducation.controller';
import { EXPERT_ROLES } from './farmerEducation.service';

export const farmerEducationRouter = Router();

farmerEducationRouter.use(requireAuth);

// Reads are open to every authenticated role (these are also the plain,
// cacheable GETs the existing client-side requestWithCacheFallback
// mechanism already makes offline-resilient — no new offline plumbing
// needed). Authoring/publishing content and answering/closing forum
// questions are Admin/Breeder/Inspector ("expert") only; asking a question
// is open to everyone.
farmerEducationRouter.get('/advisory-bundle', asyncHandler(farmerEducationController.getAdvisoryBundle));

farmerEducationRouter.get('/cultivation-guides', asyncHandler(farmerEducationController.listCultivationGuides));
farmerEducationRouter.post('/cultivation-guides', requireRole(...EXPERT_ROLES), asyncHandler(farmerEducationController.createCultivationGuide));
farmerEducationRouter.post(
  '/cultivation-guides/:id/publish',
  requireRole(...EXPERT_ROLES),
  asyncHandler(farmerEducationController.publishCultivationGuide),
);

farmerEducationRouter.get('/video-tutorials', asyncHandler(farmerEducationController.listVideoTutorials));
farmerEducationRouter.post('/video-tutorials', requireRole(...EXPERT_ROLES), asyncHandler(farmerEducationController.createVideoTutorial));
farmerEducationRouter.post(
  '/video-tutorials/:id/publish',
  requireRole(...EXPERT_ROLES),
  asyncHandler(farmerEducationController.publishVideoTutorial),
);

farmerEducationRouter.get('/disease-guides', asyncHandler(farmerEducationController.listDiseaseGuides));
farmerEducationRouter.post('/disease-guides', requireRole(...EXPERT_ROLES), asyncHandler(farmerEducationController.createDiseaseGuide));
farmerEducationRouter.post(
  '/disease-guides/:id/publish',
  requireRole(...EXPERT_ROLES),
  asyncHandler(farmerEducationController.publishDiseaseGuide),
);

farmerEducationRouter.get('/success-stories', asyncHandler(farmerEducationController.listSuccessStories));
farmerEducationRouter.post('/success-stories', requireRole(...EXPERT_ROLES), asyncHandler(farmerEducationController.createSuccessStory));

farmerEducationRouter.get('/questions', asyncHandler(farmerEducationController.listQuestions));
farmerEducationRouter.get('/questions/:id', asyncHandler(farmerEducationController.getQuestionWithAnswers));
farmerEducationRouter.post('/questions', asyncHandler(farmerEducationController.askQuestion));
farmerEducationRouter.post('/questions/:id/answers', requireRole(...EXPERT_ROLES), asyncHandler(farmerEducationController.answerQuestion));
farmerEducationRouter.post('/questions/:id/close', requireRole(...EXPERT_ROLES), asyncHandler(farmerEducationController.closeQuestion));
