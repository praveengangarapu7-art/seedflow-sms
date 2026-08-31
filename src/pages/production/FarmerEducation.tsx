import { useCallback, useEffect, useState } from 'react';
import { BookOpen, HelpCircle, RefreshCw, Sprout, Video } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  DISEASE_SEVERITIES,
  answerQaQuestion,
  askQaQuestion,
  closeQaQuestion,
  createCultivationGuide,
  createDiseaseGuide,
  createSuccessStory,
  createVideoTutorial,
  fetchAdvisoryBundle,
  fetchCultivationGuides,
  fetchDiseaseGuides,
  fetchPerformanceRatings,
  fetchQaQuestions,
  fetchSuccessStories,
  fetchVideoTutorials,
  login,
  publishCultivationGuide,
  publishDiseaseGuide,
  publishVideoTutorial,
  type AdvisoryBundle,
  type CultivationGuide,
  type DiseaseGuide,
  type DiseaseSeverity,
  type PerformanceRatingRow,
  type QaQuestion,
  type SuccessStory,
  type VideoTutorial,
} from '@/services/seedLotRealtimeClient';
import styles from './FarmerEducation.module.css';

const EXPERT_ROLES = new Set(['Admin', 'Breeder', 'Inspector']);
type Tab = 'advisory' | 'content' | 'stories' | 'qa';

function badgeClass(status: string): string {
  const key = `badge${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function FarmerEducation() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);
  const [tab, setTab] = useState<Tab>('advisory');

  const [advisoryCrop, setAdvisoryCrop] = useState('Paddy');
  const [advisoryVariety, setAdvisoryVariety] = useState('');
  const [bundle, setBundle] = useState<AdvisoryBundle | null>(null);

  const [guides, setGuides] = useState<CultivationGuide[]>([]);
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [diseaseGuides, setDiseaseGuides] = useState<DiseaseGuide[]>([]);
  const [newGuide, setNewGuide] = useState({ crop: '', variety: '', title: '', content: '' });
  const [newVideo, setNewVideo] = useState({ crop: '', variety: '', title: '', videoUrl: '', topic: '' });
  const [newDisease, setNewDisease] = useState({ crop: '', diseaseName: '', symptoms: '', managementSteps: '', severity: 'moderate' as DiseaseSeverity });

  const [ratings, setRatings] = useState<PerformanceRatingRow[]>([]);
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [newStory, setNewStory] = useState({ performanceRatingId: '', headline: '', curatedSummary: '', featured: false });

  const [questions, setQuestions] = useState<QaQuestion[]>([]);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, { answer_text: string; answered_by: string }[]>>({});
  const [newQuestion, setNewQuestion] = useState({ crop: '', variety: '', questionText: '' });
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async (accessToken: string) => {
    setError(null);
    try {
      const [guideList, videoList, diseaseList, ratingList, storyList, questionList] = await Promise.all([
        fetchCultivationGuides(accessToken),
        fetchVideoTutorials(accessToken),
        fetchDiseaseGuides(accessToken),
        fetchPerformanceRatings(accessToken),
        fetchSuccessStories(accessToken),
        fetchQaQuestions(accessToken),
      ]);
      setGuides(guideList);
      setVideos(videoList);
      setDiseaseGuides(diseaseList);
      setRatings(ratingList);
      setStories(storyList);
      setQuestions(questionList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load farmer education data');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);
        await loadAll(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the farmer education service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleRefresh = () => {
    if (token) void loadAll(token);
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleGetBundle = () =>
    withBusy(async () => {
      if (!token || !advisoryCrop.trim()) {
        setError('Enter a crop.');
        return;
      }
      setBundle(await fetchAdvisoryBundle(token, advisoryCrop.trim(), advisoryVariety.trim() || undefined));
    });

  const handleCreateGuide = () =>
    withBusy(async () => {
      if (!token || !newGuide.crop.trim() || !newGuide.title.trim() || !newGuide.content.trim()) {
        setError('Crop, title, and content are required.');
        return;
      }
      await createCultivationGuide(token, { crop: newGuide.crop.trim(), variety: newGuide.variety.trim() || undefined, title: newGuide.title.trim(), content: newGuide.content.trim() });
      setMessage('Cultivation guide created (draft).');
      setNewGuide({ crop: '', variety: '', title: '', content: '' });
      setGuides(await fetchCultivationGuides(token));
    });

  const handleCreateVideo = () =>
    withBusy(async () => {
      if (!token || !newVideo.crop.trim() || !newVideo.title.trim() || !newVideo.videoUrl.trim()) {
        setError('Crop, title, and video URL are required.');
        return;
      }
      await createVideoTutorial(token, { crop: newVideo.crop.trim(), variety: newVideo.variety.trim() || undefined, title: newVideo.title.trim(), videoUrl: newVideo.videoUrl.trim(), topic: newVideo.topic.trim() || undefined });
      setMessage('Video tutorial added (draft).');
      setNewVideo({ crop: '', variety: '', title: '', videoUrl: '', topic: '' });
      setVideos(await fetchVideoTutorials(token));
    });

  const handleCreateDisease = () =>
    withBusy(async () => {
      if (!token || !newDisease.crop.trim() || !newDisease.diseaseName.trim() || !newDisease.symptoms.trim() || !newDisease.managementSteps.trim()) {
        setError('Crop, disease name, symptoms, and management steps are required.');
        return;
      }
      await createDiseaseGuide(token, { crop: newDisease.crop.trim(), diseaseName: newDisease.diseaseName.trim(), symptoms: newDisease.symptoms.trim(), managementSteps: newDisease.managementSteps.trim(), severity: newDisease.severity });
      setMessage('Disease guide created (draft).');
      setNewDisease({ crop: '', diseaseName: '', symptoms: '', managementSteps: '', severity: 'moderate' });
      setDiseaseGuides(await fetchDiseaseGuides(token));
    });

  const handlePublish = (kind: 'guide' | 'video' | 'disease', id: string) =>
    withBusy(async () => {
      if (!token) return;
      if (kind === 'guide') await publishCultivationGuide(token, id);
      else if (kind === 'video') await publishVideoTutorial(token, id);
      else await publishDiseaseGuide(token, id);
      setMessage('Published.');
      await loadAll(token);
    });

  const handleCreateStory = () =>
    withBusy(async () => {
      if (!token || !newStory.performanceRatingId || !newStory.headline.trim() || !newStory.curatedSummary.trim()) {
        setError('Select a performance rating, and fill in headline and summary.');
        return;
      }
      await createSuccessStory(token, { performanceRatingId: newStory.performanceRatingId, headline: newStory.headline.trim(), curatedSummary: newStory.curatedSummary.trim(), featured: newStory.featured });
      setMessage('Success story curated.');
      setNewStory({ performanceRatingId: '', headline: '', curatedSummary: '', featured: false });
      setStories(await fetchSuccessStories(token));
    });

  const handleAskQuestion = () =>
    withBusy(async () => {
      if (!token || !newQuestion.questionText.trim()) {
        setError('Enter a question.');
        return;
      }
      await askQaQuestion(token, { crop: newQuestion.crop.trim() || undefined, variety: newQuestion.variety.trim() || undefined, questionText: newQuestion.questionText.trim() });
      setMessage('Question submitted.');
      setNewQuestion({ crop: '', variety: '', questionText: '' });
      setQuestions(await fetchQaQuestions(token));
    });

  const handleAnswer = (questionId: string) =>
    withBusy(async () => {
      if (!token) return;
      const answerText = answerInputs[questionId]?.trim();
      if (!answerText) {
        setError('Enter an answer.');
        return;
      }
      const updated = await answerQaQuestion(token, questionId, answerText);
      setExpandedAnswers((prev) => ({ ...prev, [questionId]: updated.answers }));
      setAnswerInputs((prev) => ({ ...prev, [questionId]: '' }));
      setMessage('Answer posted.');
      setQuestions(await fetchQaQuestions(token));
    });

  const handleClose = (questionId: string) =>
    withBusy(async () => {
      if (!token) return;
      await closeQaQuestion(token, questionId);
      setMessage('Question closed.');
      setQuestions(await fetchQaQuestions(token));
    });

  const isExpert = EXPERT_ROLES.has(role);
  const publishedGuideCount = guides.filter((g) => g.status === 'published').length;
  const openQuestionCount = questions.filter((q) => q.status === 'open').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Farmer Education &amp; Extension Resources</h1>
          <p className={styles.subtitle}>
            Variety-specific cultivation guides, video tutorials, disease identification and management, agronomic
            advisory linked to a planted variety, success stories curated from real farmer feedback, and a Q&amp;A
            forum connected to experts.
          </p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KpiCard title="Published Guides" value={String(publishedGuideCount)} icon={BookOpen} />
        <KpiCard title="Video Tutorials" value={String(videos.length)} icon={Video} />
        <KpiCard title="Success Stories" value={String(stories.length)} icon={Sprout} />
        <KpiCard title="Open Questions" value={String(openQuestionCount)} icon={HelpCircle} />
      </div>

      <div className={styles.tabBar}>
        {(['advisory', 'content', 'stories', 'qa'] as Tab[]).map((t) => (
          <button key={t} className={`${styles.tabButton} ${tab === t ? styles.tabButtonActive : ''}`} onClick={() => setTab(t)}>
            {t === 'advisory' ? 'Advisory Bundle' : t === 'content' ? 'Guides & Videos' : t === 'stories' ? 'Success Stories' : 'Q&A Forum'}
          </button>
        ))}
      </div>

      {tab === 'advisory' && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Advisory Bundle for a Planted Variety</h2>
          <p className={styles.sectionSubtitle}>Combines the existing agronomic advisory with every published guide, video, disease reference, and success story relevant to this crop/variety.</p>
          <div className={styles.formRow}>
            <input className={styles.textInput} placeholder="Crop (e.g. Paddy)" value={advisoryCrop} onChange={(e) => setAdvisoryCrop(e.target.value)} />
            <input className={styles.textInput} placeholder="Variety (optional)" value={advisoryVariety} onChange={(e) => setAdvisoryVariety(e.target.value)} />
            <Button size="sm" isLoading={busy} onClick={() => void handleGetBundle()}>Get Advisory</Button>
          </div>
          {bundle && (
            <div className={styles.grid}>
              <div>
                <div className={styles.row}>
                  <div>
                    <strong>Sowing window:</strong> {bundle.agroAdvisory.idealSowingWindow}
                    <div className={styles.rowMeta}>Spacing: {bundle.agroAdvisory.spacing} · Nutrients: {bundle.agroAdvisory.nutrients} · Soils: {bundle.agroAdvisory.suitableSoils.join(', ') || 'any'}</div>
                  </div>
                </div>
                <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem', marginTop: '1rem' }}>Cultivation Guides ({bundle.cultivationGuides.length})</h3>
                {bundle.cultivationGuides.map((g) => (
                  <div key={g.id} className={styles.row}><div><strong>{g.title}</strong><div className={styles.rowMeta}>{g.content}</div></div></div>
                ))}
                <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem', marginTop: '1rem' }}>Video Tutorials ({bundle.videoTutorials.length})</h3>
                {bundle.videoTutorials.map((v) => (
                  <div key={v.id} className={styles.row}><div><strong>{v.title}</strong><div className={styles.rowMeta}>{v.video_url}</div></div></div>
                ))}
              </div>
              <div>
                <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem' }}>Disease Guides ({bundle.diseaseGuides.length})</h3>
                {bundle.diseaseGuides.map((d) => (
                  <div key={d.id} className={styles.row}><div><strong>{d.disease_name}</strong><div className={styles.rowMeta}>{d.management_steps}</div></div></div>
                ))}
                <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem', marginTop: '1rem' }}>Success Stories ({bundle.successStories.length})</h3>
                {bundle.successStories.map((s) => (
                  <div key={s.id} className={styles.row}><div><strong>{s.headline}</strong><div className={styles.rowMeta}>{s.curated_summary}</div></div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'content' && (
        <div className={styles.grid}>
          <div>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Cultivation Guides</h2>
              {isExpert && (
                <>
                  <div className={styles.formRow}>
                    <input className={styles.textInput} placeholder="Crop" value={newGuide.crop} onChange={(e) => setNewGuide((g) => ({ ...g, crop: e.target.value }))} />
                    <input className={styles.textInput} placeholder="Variety (optional)" value={newGuide.variety} onChange={(e) => setNewGuide((g) => ({ ...g, variety: e.target.value }))} />
                  </div>
                  <input className={styles.textInput} style={{ marginBottom: '0.5rem', width: '100%' }} placeholder="Title" value={newGuide.title} onChange={(e) => setNewGuide((g) => ({ ...g, title: e.target.value }))} />
                  <textarea className={styles.textArea} placeholder="Content" value={newGuide.content} onChange={(e) => setNewGuide((g) => ({ ...g, content: e.target.value }))} />
                  <Button size="sm" isLoading={busy} onClick={() => void handleCreateGuide()}>Create Guide</Button>
                </>
              )}
              {guides.length === 0 ? <div className={styles.emptyState}>No guides yet.</div> : guides.map((g) => (
                <div key={g.id} className={styles.row}>
                  <div>
                    <strong>{g.title}</strong>
                    <span className={`${styles.badge} ${badgeClass(g.status)}`} style={{ marginLeft: '0.5rem' }}>{g.status}</span>
                    <div className={styles.rowMeta}>{g.crop}{g.variety ? ` / ${g.variety}` : ''}</div>
                  </div>
                  {g.status === 'draft' && isExpert && <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handlePublish('guide', g.id)}>Publish</Button>}
                </div>
              ))}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Video Tutorials</h2>
              {isExpert && (
                <>
                  <div className={styles.formRow}>
                    <input className={styles.textInput} placeholder="Crop" value={newVideo.crop} onChange={(e) => setNewVideo((v) => ({ ...v, crop: e.target.value }))} />
                    <input className={styles.textInput} placeholder="Title" value={newVideo.title} onChange={(e) => setNewVideo((v) => ({ ...v, title: e.target.value }))} />
                  </div>
                  <div className={styles.formRow}>
                    <input className={styles.textInput} placeholder="Video URL" value={newVideo.videoUrl} onChange={(e) => setNewVideo((v) => ({ ...v, videoUrl: e.target.value }))} />
                    <input className={styles.textInput} placeholder="Topic (optional)" value={newVideo.topic} onChange={(e) => setNewVideo((v) => ({ ...v, topic: e.target.value }))} />
                    <Button size="sm" isLoading={busy} onClick={() => void handleCreateVideo()}>Add Video</Button>
                  </div>
                </>
              )}
              {videos.length === 0 ? <div className={styles.emptyState}>No videos yet.</div> : videos.map((v) => (
                <div key={v.id} className={styles.row}>
                  <div>
                    <strong>{v.title}</strong>
                    <span className={`${styles.badge} ${badgeClass(v.status)}`} style={{ marginLeft: '0.5rem' }}>{v.status}</span>
                    <div className={styles.rowMeta}>{v.crop} · {v.video_url}</div>
                  </div>
                  {v.status === 'draft' && isExpert && <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handlePublish('video', v.id)}>Publish</Button>}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Disease Identification &amp; Management</h2>
            {isExpert && (
              <>
                <div className={styles.formRow}>
                  <input className={styles.textInput} placeholder="Crop" value={newDisease.crop} onChange={(e) => setNewDisease((d) => ({ ...d, crop: e.target.value }))} />
                  <input className={styles.textInput} placeholder="Disease name" value={newDisease.diseaseName} onChange={(e) => setNewDisease((d) => ({ ...d, diseaseName: e.target.value }))} />
                  <select className={styles.select} value={newDisease.severity} onChange={(e) => setNewDisease((d) => ({ ...d, severity: e.target.value as DiseaseSeverity }))}>
                    {DISEASE_SEVERITIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <textarea className={styles.textArea} placeholder="Symptoms" value={newDisease.symptoms} onChange={(e) => setNewDisease((d) => ({ ...d, symptoms: e.target.value }))} />
                <textarea className={styles.textArea} placeholder="Management steps" value={newDisease.managementSteps} onChange={(e) => setNewDisease((d) => ({ ...d, managementSteps: e.target.value }))} />
                <Button size="sm" isLoading={busy} onClick={() => void handleCreateDisease()}>Create Disease Guide</Button>
              </>
            )}
            {diseaseGuides.length === 0 ? <div className={styles.emptyState}>No disease guides yet.</div> : diseaseGuides.map((d) => (
              <div key={d.id} className={styles.row}>
                <div>
                  <strong>{d.disease_name}</strong> ({d.crop}) — {d.severity ?? 'unrated'}
                  <span className={`${styles.badge} ${badgeClass(d.status)}`} style={{ marginLeft: '0.5rem' }}>{d.status}</span>
                  <div className={styles.rowMeta}>{d.symptoms}</div>
                </div>
                {d.status === 'draft' && isExpert && <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handlePublish('disease', d.id)}>Publish</Button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'stories' && (
        <div className={styles.grid}>
          {isExpert && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Curate a Success Story</h2>
              <p className={styles.sectionSubtitle}>Always linked to a real, previously-recorded farmer performance rating — never an invented testimonial.</p>
              <div className={styles.formRow}>
                <select className={styles.select} value={newStory.performanceRatingId} onChange={(e) => setNewStory((s) => ({ ...s, performanceRatingId: e.target.value }))}>
                  <option value="">Select a performance rating</option>
                  {ratings.map((r) => (
                    <option key={r.id} value={r.id}>{r.crop} / {r.variety} — {r.overall_rating}/5 ({r.feedback_text?.slice(0, 40) ?? 'no feedback text'})</option>
                  ))}
                </select>
              </div>
              <input className={styles.textInput} style={{ marginBottom: '0.5rem', width: '100%' }} placeholder="Headline" value={newStory.headline} onChange={(e) => setNewStory((s) => ({ ...s, headline: e.target.value }))} />
              <textarea className={styles.textArea} placeholder="Curated summary" value={newStory.curatedSummary} onChange={(e) => setNewStory((s) => ({ ...s, curatedSummary: e.target.value }))} />
              <div className={styles.formRow}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={newStory.featured} onChange={(e) => setNewStory((s) => ({ ...s, featured: e.target.checked }))} /> Feature this story
                </label>
                <Button size="sm" isLoading={busy} onClick={() => void handleCreateStory()}>Curate Story</Button>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Success Stories</h2>
            {stories.length === 0 ? <div className={styles.emptyState}>No success stories yet.</div> : stories.map((s) => (
              <div key={s.id} className={styles.row}>
                <div>
                  <strong>{s.headline}</strong> {s.featured ? <span className={`${styles.badge} ${styles.badgePublished}`} style={{ marginLeft: '0.4rem' }}>featured</span> : null}
                  <div className={styles.rowMeta}>{s.crop} / {s.variety} — {s.curated_summary}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'qa' && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Ask a Question</h2>
            <div className={styles.formRow}>
              <input className={styles.textInput} placeholder="Crop (optional)" value={newQuestion.crop} onChange={(e) => setNewQuestion((q) => ({ ...q, crop: e.target.value }))} />
              <input className={styles.textInput} placeholder="Variety (optional)" value={newQuestion.variety} onChange={(e) => setNewQuestion((q) => ({ ...q, variety: e.target.value }))} />
            </div>
            <textarea className={styles.textArea} placeholder="Your question…" value={newQuestion.questionText} onChange={(e) => setNewQuestion((q) => ({ ...q, questionText: e.target.value }))} />
            <Button size="sm" isLoading={busy} onClick={() => void handleAskQuestion()}>Ask</Button>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Forum Questions</h2>
            {questions.length === 0 ? <div className={styles.emptyState}>No questions yet.</div> : questions.map((q) => (
              <div key={q.id} className={styles.row} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <strong>{q.question_text}</strong>
                    <span className={`${styles.badge} ${badgeClass(q.status)}`} style={{ marginLeft: '0.5rem' }}>{q.status}</span>
                    <div className={styles.rowMeta}>{q.crop ?? 'any crop'}{q.variety ? ` / ${q.variety}` : ''} — asked by {q.asked_by}</div>
                  </div>
                  {q.status !== 'closed' && isExpert && (
                    <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleClose(q.id)}>Close</Button>
                  )}
                </div>
                {expandedAnswers[q.id]?.map((a, i) => (
                  <div key={i} className={styles.answerBlock}><strong>{a.answered_by}:</strong> {a.answer_text}</div>
                ))}
                {q.status !== 'closed' && isExpert && (
                  <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                    <input className={styles.textInput} placeholder="Your expert answer…" value={answerInputs[q.id] ?? ''} onChange={(e) => setAnswerInputs((prev) => ({ ...prev, [q.id]: e.target.value }))} />
                    <Button size="sm" isLoading={busy} onClick={() => void handleAnswer(q.id)}>Answer</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
