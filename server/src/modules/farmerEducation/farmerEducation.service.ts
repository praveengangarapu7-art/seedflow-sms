import { pool } from '../../db/pool';
import { withTransaction } from '../../db/transaction';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import type { AuthenticatedUser } from '../../middleware/requireAuth';
import { insertAuditLog } from '../auditLogs/auditLogs.service';
import { getAgroAdvisory } from '../cropPlanning/cropPlanning.service';
import { rankByRelevance } from './contentRelevance';
import {
  CONTENT_STATUSES,
  DISEASE_SEVERITIES,
  QA_QUESTION_STATUSES,
  type AdvisoryBundle,
  type CreateCultivationGuideInput,
  type CreateDiseaseGuideInput,
  type CreateQaQuestionInput,
  type CreateSuccessStoryInput,
  type CreateVideoTutorialInput,
  type CultivationGuideRow,
  type DiseaseGuideRow,
  type QaAnswerRow,
  type QaQuestionRow,
  type QaQuestionWithAnswers,
  type SuccessStoryRow,
  type VideoTutorialRow,
} from './farmerEducation.types';

// Authoring guides/videos/disease information, curating success stories,
// and answering the Q&A forum are all "expert" activities — Admin/Breeder/
// Inspector, this app's existing platform-level technical-authority roles,
// distinct from the org-bound operational roles (Producer/Warehouse
// Manager). Asking a question is open to everyone, same as this app's
// general read-access convention.
export const EXPERT_ROLES = ['Admin', 'Breeder', 'Inspector'];

function assertExpert(user: AuthenticatedUser, action: string): void {
  if (!EXPERT_ROLES.includes(user.role)) {
    throw new ForbiddenError(`Only ${EXPERT_ROLES.join(', ')} can ${action}`);
  }
}

// --- Cultivation guides ----------------------------------------------------

export async function createCultivationGuide(input: CreateCultivationGuideInput, user: AuthenticatedUser): Promise<CultivationGuideRow> {
  assertExpert(user, 'author a cultivation guide');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.title?.trim()) throw new ValidationError('title is required');
  if (!input.content?.trim()) throw new ValidationError('content is required');

  const result = await pool.query<CultivationGuideRow>(
    `INSERT INTO cultivation_guides (crop, variety, title, content, stage, author)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.crop.trim(), input.variety?.trim() || null, input.title.trim(), input.content.trim(), input.stage?.trim() || null, user.email],
  );
  return result.rows[0];
}

export async function publishCultivationGuide(id: string, user: AuthenticatedUser): Promise<CultivationGuideRow> {
  assertExpert(user, 'publish a cultivation guide');
  return withTransaction(async (client) => {
    const result = await client.query<CultivationGuideRow>(
      `UPDATE cultivation_guides SET status = 'published', updated_at = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundError(`Cultivation guide ${id} not found`);
    await insertAuditLog(client, { entityType: 'cultivation_guide', entityId: id, action: 'PUBLISH', performedBy: user.email, afterState: row });
    return row;
  });
}

export async function listCultivationGuides(filters: { crop?: string; variety?: string; status?: string } = {}): Promise<CultivationGuideRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`(variety = $${values.length} OR variety IS NULL)`);
  }
  if (filters.status) {
    if (!(CONTENT_STATUSES as readonly string[]).includes(filters.status)) {
      throw new ValidationError(`status must be one of: ${CONTENT_STATUSES.join(', ')}`);
    }
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<CultivationGuideRow>(
    `SELECT * FROM cultivation_guides ${whereClause} ORDER BY created_at DESC LIMIT 200`,
    values,
  );
  return filters.variety ? rankByRelevance(result.rows, filters.variety) : result.rows;
}

// --- Video tutorials --------------------------------------------------------

export async function createVideoTutorial(input: CreateVideoTutorialInput, user: AuthenticatedUser): Promise<VideoTutorialRow> {
  assertExpert(user, 'add a video tutorial');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.title?.trim()) throw new ValidationError('title is required');
  if (!input.videoUrl?.trim()) throw new ValidationError('videoUrl is required');

  const result = await pool.query<VideoTutorialRow>(
    `INSERT INTO video_tutorials (crop, variety, title, description, video_url, thumbnail_url, duration_seconds, topic, author)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      input.crop.trim(),
      input.variety?.trim() || null,
      input.title.trim(),
      input.description ?? null,
      input.videoUrl.trim(),
      input.thumbnailUrl ?? null,
      input.durationSeconds ?? null,
      input.topic?.trim() || null,
      user.email,
    ],
  );
  return result.rows[0];
}

export async function publishVideoTutorial(id: string, user: AuthenticatedUser): Promise<VideoTutorialRow> {
  assertExpert(user, 'publish a video tutorial');
  const result = await pool.query<VideoTutorialRow>(`UPDATE video_tutorials SET status = 'published' WHERE id = $1 RETURNING *`, [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Video tutorial ${id} not found`);
  return row;
}

export async function listVideoTutorials(filters: { crop?: string; variety?: string; status?: string } = {}): Promise<VideoTutorialRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`(variety = $${values.length} OR variety IS NULL)`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<VideoTutorialRow>(`SELECT * FROM video_tutorials ${whereClause} ORDER BY created_at DESC LIMIT 200`, values);
  return filters.variety ? rankByRelevance(result.rows, filters.variety) : result.rows;
}

// --- Disease guides ---------------------------------------------------------

export async function createDiseaseGuide(input: CreateDiseaseGuideInput, user: AuthenticatedUser): Promise<DiseaseGuideRow> {
  assertExpert(user, 'author a disease guide');
  if (!input.crop?.trim()) throw new ValidationError('crop is required');
  if (!input.diseaseName?.trim()) throw new ValidationError('diseaseName is required');
  if (!input.symptoms?.trim()) throw new ValidationError('symptoms is required');
  if (!input.managementSteps?.trim()) throw new ValidationError('managementSteps is required');
  if (input.severity && !(DISEASE_SEVERITIES as readonly string[]).includes(input.severity)) {
    throw new ValidationError(`severity must be one of: ${DISEASE_SEVERITIES.join(', ')}`);
  }

  const result = await pool.query<DiseaseGuideRow>(
    `INSERT INTO disease_guides (crop, disease_name, symptoms, management_steps, severity, reference_image_url, author)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.crop.trim(), input.diseaseName.trim(), input.symptoms.trim(), input.managementSteps.trim(), input.severity ?? null, input.referenceImageUrl ?? null, user.email],
  );
  return result.rows[0];
}

export async function publishDiseaseGuide(id: string, user: AuthenticatedUser): Promise<DiseaseGuideRow> {
  assertExpert(user, 'publish a disease guide');
  const result = await pool.query<DiseaseGuideRow>(`UPDATE disease_guides SET status = 'published' WHERE id = $1 RETURNING *`, [id]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Disease guide ${id} not found`);
  return row;
}

export async function listDiseaseGuides(filters: { crop?: string; status?: string } = {}): Promise<DiseaseGuideRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<DiseaseGuideRow>(`SELECT * FROM disease_guides ${whereClause} ORDER BY created_at DESC LIMIT 200`, values);
  return result.rows;
}

// --- Success stories (curated FROM real farmer feedback) --------------------

export async function createSuccessStory(input: CreateSuccessStoryInput, user: AuthenticatedUser): Promise<SuccessStoryRow> {
  assertExpert(user, 'curate a success story');
  if (!input.performanceRatingId) throw new ValidationError('performanceRatingId is required');
  if (!input.headline?.trim()) throw new ValidationError('headline is required');
  if (!input.curatedSummary?.trim()) throw new ValidationError('curatedSummary is required');

  const ratingResult = await pool.query<{ crop: string; variety: string }>(
    'SELECT crop, variety FROM performance_ratings WHERE id = $1',
    [input.performanceRatingId],
  );
  const rating = ratingResult.rows[0];
  if (!rating) throw new NotFoundError(`Performance rating ${input.performanceRatingId} not found`);

  const existing = await pool.query('SELECT 1 FROM success_stories WHERE performance_rating_id = $1', [input.performanceRatingId]);
  if (existing.rows[0]) throw new ConflictError('A success story has already been curated from this performance rating');

  const result = await pool.query<SuccessStoryRow>(
    `INSERT INTO success_stories (performance_rating_id, crop, variety, headline, curated_summary, featured, curated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.performanceRatingId, rating.crop, rating.variety, input.headline.trim(), input.curatedSummary.trim(), input.featured ?? false, user.email],
  );
  return result.rows[0];
}

export async function listSuccessStories(filters: { crop?: string; variety?: string; featured?: boolean } = {}): Promise<SuccessStoryRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`variety = $${values.length}`);
  }
  if (filters.featured !== undefined) {
    values.push(filters.featured);
    conditions.push(`featured = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<SuccessStoryRow>(
    `SELECT * FROM success_stories ${whereClause} ORDER BY featured DESC, created_at DESC LIMIT 200`,
    values,
  );
  return result.rows;
}

// --- Q&A forum ---------------------------------------------------------------

export async function askQuestion(input: CreateQaQuestionInput, user: AuthenticatedUser): Promise<QaQuestionRow> {
  if (!input.questionText?.trim()) throw new ValidationError('questionText is required');

  const result = await pool.query<QaQuestionRow>(
    `INSERT INTO qa_questions (crop, variety, farmer_id, question_text, asked_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.crop?.trim() || null, input.variety?.trim() || null, input.farmerId ?? null, input.questionText.trim(), user.email],
  );
  return result.rows[0];
}

export async function answerQuestion(questionId: string, answerText: string, user: AuthenticatedUser): Promise<QaQuestionWithAnswers> {
  assertExpert(user, 'answer a forum question');
  if (!answerText?.trim()) throw new ValidationError('answerText is required');

  return withTransaction(async (client) => {
    const questionResult = await client.query<QaQuestionRow>('SELECT * FROM qa_questions WHERE id = $1 FOR UPDATE', [questionId]);
    const question = questionResult.rows[0];
    if (!question) throw new NotFoundError(`Question ${questionId} not found`);
    if (question.status === 'closed') throw new ConflictError('This question is closed and cannot receive new answers');

    await client.query(
      `INSERT INTO qa_answers (question_id, answer_text, answered_by, expert_role) VALUES ($1, $2, $3, $4)`,
      [questionId, answerText.trim(), user.email, user.role],
    );
    const updatedQuestionResult = await client.query<QaQuestionRow>(
      `UPDATE qa_questions SET status = 'answered' WHERE id = $1 RETURNING *`,
      [questionId],
    );
    const answersResult = await client.query<QaAnswerRow>('SELECT * FROM qa_answers WHERE question_id = $1 ORDER BY created_at ASC', [questionId]);

    await insertAuditLog(client, {
      entityType: 'qa_question',
      entityId: questionId,
      action: 'ANSWER',
      performedBy: user.email,
      metadata: { expertRole: user.role },
    });

    return { ...updatedQuestionResult.rows[0], answers: answersResult.rows };
  });
}

export async function closeQuestion(questionId: string, user: AuthenticatedUser): Promise<QaQuestionRow> {
  assertExpert(user, 'close a forum question');
  const result = await pool.query<QaQuestionRow>(`UPDATE qa_questions SET status = 'closed' WHERE id = $1 RETURNING *`, [questionId]);
  const row = result.rows[0];
  if (!row) throw new NotFoundError(`Question ${questionId} not found`);
  return row;
}

export async function listQuestions(filters: { crop?: string; variety?: string; status?: string } = {}): Promise<QaQuestionRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.crop) {
    values.push(filters.crop);
    conditions.push(`crop = $${values.length}`);
  }
  if (filters.variety) {
    values.push(filters.variety);
    conditions.push(`variety = $${values.length}`);
  }
  if (filters.status) {
    if (!(QA_QUESTION_STATUSES as readonly string[]).includes(filters.status)) {
      throw new ValidationError(`status must be one of: ${QA_QUESTION_STATUSES.join(', ')}`);
    }
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<QaQuestionRow>(`SELECT * FROM qa_questions ${whereClause} ORDER BY created_at DESC LIMIT 200`, values);
  return result.rows;
}

export async function getQuestionWithAnswers(questionId: string): Promise<QaQuestionWithAnswers> {
  const questionResult = await pool.query<QaQuestionRow>('SELECT * FROM qa_questions WHERE id = $1', [questionId]);
  const question = questionResult.rows[0];
  if (!question) throw new NotFoundError(`Question ${questionId} not found`);
  const answersResult = await pool.query<QaAnswerRow>('SELECT * FROM qa_answers WHERE question_id = $1 ORDER BY created_at ASC', [questionId]);
  return { ...question, answers: answersResult.rows };
}

// --- Combined advisory bundle for a planted variety -------------------------

/**
 * "Agronomic advisory linked to planted variety" — wraps the EXISTING
 * cropPlanning.getAgroAdvisory(crop) (not duplicated) alongside every
 * published education-content type relevant to this crop/variety, ranked
 * by variety-specificity. This is the one endpoint a farmer-facing (or
 * staff-on-behalf-of-farmer) view calls for a fully unified picture.
 */
export async function getAdvisoryBundle(crop: string, variety?: string): Promise<AdvisoryBundle> {
  if (!crop?.trim()) throw new ValidationError('crop is required');

  const [cultivationGuides, videoTutorials, diseaseGuides, successStories] = await Promise.all([
    listCultivationGuides({ crop, variety, status: 'published' }),
    listVideoTutorials({ crop, variety, status: 'published' }),
    listDiseaseGuides({ crop, status: 'published' }),
    variety ? listSuccessStories({ crop, variety }) : Promise.resolve([]),
  ]);

  return {
    crop,
    variety: variety ?? null,
    agroAdvisory: getAgroAdvisory(crop),
    cultivationGuides,
    videoTutorials,
    diseaseGuides,
    successStories,
  };
}
