import type { AgroAdvisory } from '../cropPlanning/cropPlanning.types';

export const CONTENT_STATUSES = ['draft', 'published'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export interface CultivationGuideRow {
  id: string;
  crop: string;
  variety: string | null;
  title: string;
  content: string;
  stage: string | null;
  status: ContentStatus;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCultivationGuideInput {
  crop: string;
  variety?: string;
  title: string;
  content: string;
  stage?: string;
}

export interface VideoTutorialRow {
  id: string;
  crop: string;
  variety: string | null;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  topic: string | null;
  status: ContentStatus;
  author: string;
  created_at: string;
}

export interface CreateVideoTutorialInput {
  crop: string;
  variety?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  topic?: string;
}

export const DISEASE_SEVERITIES = ['low', 'moderate', 'high', 'severe'] as const;
export type DiseaseSeverity = (typeof DISEASE_SEVERITIES)[number];

export interface DiseaseGuideRow {
  id: string;
  crop: string;
  disease_name: string;
  symptoms: string;
  management_steps: string;
  severity: DiseaseSeverity | null;
  reference_image_url: string | null;
  status: ContentStatus;
  author: string;
  created_at: string;
}

export interface CreateDiseaseGuideInput {
  crop: string;
  diseaseName: string;
  symptoms: string;
  managementSteps: string;
  severity?: DiseaseSeverity;
  referenceImageUrl?: string;
}

export interface SuccessStoryRow {
  id: string;
  performance_rating_id: string;
  crop: string;
  variety: string;
  headline: string;
  curated_summary: string;
  featured: boolean;
  curated_by: string;
  created_at: string;
}

export interface CreateSuccessStoryInput {
  performanceRatingId: string;
  headline: string;
  curatedSummary: string;
  featured?: boolean;
}

export const QA_QUESTION_STATUSES = ['open', 'answered', 'closed'] as const;
export type QaQuestionStatus = (typeof QA_QUESTION_STATUSES)[number];

export interface QaQuestionRow {
  id: string;
  crop: string | null;
  variety: string | null;
  farmer_id: string | null;
  question_text: string;
  asked_by: string;
  status: QaQuestionStatus;
  created_at: string;
}

export interface CreateQaQuestionInput {
  crop?: string;
  variety?: string;
  farmerId?: string;
  questionText: string;
}

export interface QaAnswerRow {
  id: string;
  question_id: string;
  answer_text: string;
  answered_by: string;
  expert_role: string;
  created_at: string;
}

export interface QaQuestionWithAnswers extends QaQuestionRow {
  answers: QaAnswerRow[];
}

export interface AdvisoryBundle {
  crop: string;
  variety: string | null;
  agroAdvisory: AgroAdvisory;
  cultivationGuides: CultivationGuideRow[];
  videoTutorials: VideoTutorialRow[];
  diseaseGuides: DiseaseGuideRow[];
  successStories: SuccessStoryRow[];
}
