import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestFarmer, createTestUser } from '../factories';
import { uniqueSuffix } from '../factories/ids';
import { loginAs } from './authHelper';
import { app } from './testApp';

describe('farmer education API', () => {
  it('creates and publishes a cultivation guide, blocking a non-expert role, and ranks variety-specific content first', async () => {
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const crop = `Crop-${uniqueSuffix()}`;
    const variety = `Variety-${uniqueSuffix()}`;

    const forbidden = await request(app)
      .post('/api/v1/farmer-education/cultivation-guides')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ crop, title: 'x', content: 'y' });
    expect(forbidden.status).toBe(403);

    const cropWideRes = await request(app)
      .post('/api/v1/farmer-education/cultivation-guides')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ crop, title: 'General cultivation tips', content: 'Water regularly.' });
    expect(cropWideRes.status).toBe(201);
    expect(cropWideRes.body.data.status).toBe('draft');

    const varietySpecificRes = await request(app)
      .post('/api/v1/farmer-education/cultivation-guides')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ crop, variety, title: 'Variety-specific tips', content: 'This variety needs less water.' });
    expect(varietySpecificRes.status).toBe(201);

    await request(app).post(`/api/v1/farmer-education/cultivation-guides/${cropWideRes.body.data.id}/publish`).set('Authorization', `Bearer ${inspectorToken}`);
    await request(app).post(`/api/v1/farmer-education/cultivation-guides/${varietySpecificRes.body.data.id}/publish`).set('Authorization', `Bearer ${inspectorToken}`);

    const listRes = await request(app)
      .get(`/api/v1/farmer-education/cultivation-guides?crop=${crop}&variety=${variety}&status=published`)
      .set('Authorization', `Bearer ${producerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(2);
    expect(listRes.body.data[0].id).toBe(varietySpecificRes.body.data.id); // variety-specific ranked first
  });

  it('adds and publishes a video tutorial (metadata/URL only, no hosting)', async () => {
    const breeder = await createTestUser({ role: 'Breeder' });
    const breederToken = await loginAs(breeder);
    const crop = `Crop-${uniqueSuffix()}`;

    const res = await request(app)
      .post('/api/v1/farmer-education/video-tutorials')
      .set('Authorization', `Bearer ${breederToken}`)
      .send({ crop, title: 'Sowing technique', videoUrl: 'https://example.com/videos/sowing.mp4', topic: 'planting' });
    expect(res.status).toBe(201);
    expect(res.body.data.video_url).toBe('https://example.com/videos/sowing.mp4');

    await request(app).post(`/api/v1/farmer-education/video-tutorials/${res.body.data.id}/publish`).set('Authorization', `Bearer ${breederToken}`);

    const listRes = await request(app).get(`/api/v1/farmer-education/video-tutorials?crop=${crop}&status=published`).set('Authorization', `Bearer ${breederToken}`);
    expect(listRes.body.data).toHaveLength(1);
  });

  it('creates and publishes a disease guide', async () => {
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const crop = `Crop-${uniqueSuffix()}`;

    const res = await request(app)
      .post('/api/v1/farmer-education/disease-guides')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ crop, diseaseName: 'Blast', symptoms: 'Lesions on leaves', managementSteps: 'Apply fungicide', severity: 'high' });
    expect(res.status).toBe(201);

    await request(app).post(`/api/v1/farmer-education/disease-guides/${res.body.data.id}/publish`).set('Authorization', `Bearer ${adminToken}`);
    const listRes = await request(app).get(`/api/v1/farmer-education/disease-guides?crop=${crop}&status=published`).set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].disease_name).toBe('Blast');
  });

  it('curates a success story FROM a real performance rating, preventing duplicates and fabrication', async () => {
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const farmer = await createTestFarmer();
    const crop = `Crop-${uniqueSuffix()}`;
    const variety = `Variety-${uniqueSuffix()}`;

    const ratingRes = await request(app)
      .post('/api/v1/production/performance-ratings')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ farmerId: farmer.id, crop, variety, germinationRating: 5, yieldRating: 5, overallRating: 5, feedbackText: 'Best harvest in years' });
    expect(ratingRes.status).toBe(201);

    const storyRes = await request(app)
      .post('/api/v1/farmer-education/success-stories')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ performanceRatingId: ratingRes.body.data.id, headline: 'Record yield with new variety', curatedSummary: 'Farmer reported excellent results.', featured: true });
    expect(storyRes.status).toBe(201);
    expect(storyRes.body.data.crop).toBe(crop); // pulled from the real rating, not re-entered
    expect(storyRes.body.data.variety).toBe(variety);

    const duplicateRes = await request(app)
      .post('/api/v1/farmer-education/success-stories')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ performanceRatingId: ratingRes.body.data.id, headline: 'Duplicate', curatedSummary: 'x' });
    expect(duplicateRes.status).toBe(409);

    const fakeRatingRes = await request(app)
      .post('/api/v1/farmer-education/success-stories')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ performanceRatingId: '00000000-0000-0000-0000-000000000000', headline: 'Fabricated', curatedSummary: 'x' });
    expect(fakeRatingRes.status).toBe(404);

    const listRes = await request(app).get(`/api/v1/farmer-education/success-stories?crop=${crop}&featured=true`).set('Authorization', `Bearer ${inspectorToken}`);
    expect(listRes.body.data).toHaveLength(1);
  });

  it('runs the full Q&A forum lifecycle: ask -> answer (expert-only) -> close, blocking a non-expert from answering', async () => {
    const producer = await createTestUser({ role: 'Producer' });
    const producerToken = await loginAs(producer);
    const admin = await createTestUser({ role: 'Admin' });
    const adminToken = await loginAs(admin);
    const crop = `Crop-${uniqueSuffix()}`;

    const askRes = await request(app)
      .post('/api/v1/farmer-education/questions')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ crop, questionText: 'Why are my leaves yellowing?' });
    expect(askRes.status).toBe(201);
    expect(askRes.body.data.status).toBe('open');
    const questionId = askRes.body.data.id;

    const wrongAnswerer = await request(app)
      .post(`/api/v1/farmer-education/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${producerToken}`)
      .send({ answerText: 'Not sure' });
    expect(wrongAnswerer.status).toBe(403);

    const answerRes = await request(app)
      .post(`/api/v1/farmer-education/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ answerText: 'Likely nitrogen deficiency — apply a top-dress.' });
    expect(answerRes.status).toBe(201);
    expect(answerRes.body.data.status).toBe('answered');
    expect(answerRes.body.data.answers).toHaveLength(1);
    expect(answerRes.body.data.answers[0].expert_role).toBe('Admin');

    const getRes = await request(app).get(`/api/v1/farmer-education/questions/${questionId}`).set('Authorization', `Bearer ${producerToken}`);
    expect(getRes.body.data.answers).toHaveLength(1);

    const closeRes = await request(app).post(`/api/v1/farmer-education/questions/${questionId}/close`).set('Authorization', `Bearer ${adminToken}`);
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe('closed');

    const answerAfterClose = await request(app)
      .post(`/api/v1/farmer-education/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ answerText: 'too late' });
    expect(answerAfterClose.status).toBe(409);
  });

  it('combines the existing agronomic advisory with published content into one advisory bundle', async () => {
    const inspector = await createTestUser({ role: 'Inspector' });
    const inspectorToken = await loginAs(inspector);
    const variety = `Variety-${uniqueSuffix()}`;

    // Paddy already has a real CROP_ADVISORY entry in cropPlanning.validation.ts.
    const guideRes = await request(app)
      .post('/api/v1/farmer-education/cultivation-guides')
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ crop: 'Paddy', variety, title: 'Bundle test guide', content: 'x' });
    await request(app).post(`/api/v1/farmer-education/cultivation-guides/${guideRes.body.data.id}/publish`).set('Authorization', `Bearer ${inspectorToken}`);

    const res = await request(app)
      .get(`/api/v1/farmer-education/advisory-bundle?crop=Paddy&variety=${variety}`)
      .set('Authorization', `Bearer ${inspectorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.agroAdvisory.idealSowingWindow).toMatch(/Kharif|Rabi/);
    expect(res.body.data.cultivationGuides.some((g: { id: string }) => g.id === guideRes.body.data.id)).toBe(true);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/farmer-education/cultivation-guides');
    expect(res.status).toBe(401);
  });
});
