import { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { PhotoUpload } from '@/components/common/PhotoUpload/PhotoUpload';
import { masterDataApi, productionApi, type Farm, type FieldInspection } from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import { seedFarms } from './cropPlanningData';
import { cropStageOptions, generateAiPrediction, healthScoreClass } from './fieldInspectionData';
import styles from './production.module.css';

interface UploadedPhoto {
  id: string;
  url: string;
  caption?: string;
}

export default function FieldInspectionForm() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [farms, setFarms] = useState<Farm[]>(seedFarms);

  const [farmId, setFarmId] = useState('');
  const [cropStage, setCropStage] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [healthScore, setHealthScore] = useState(75);
  const [diseaseDetected, setDiseaseDetected] = useState(false);
  const [diseaseName, setDiseaseName] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const farmsData = await masterDataApi.getFarms();
        setFarms(Array.isArray(farmsData) && farmsData.length > 0 ? farmsData : seedFarms);
      } catch {
        setFarms(seedFarms);
      }
    };

    void load();
  }, []);

  const handleAddPhotos = (files: File[]) => {
    const newPhotos = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      caption: file.name,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!farmId) {
      setError('Please select a farm.');
      return;
    }
    if (!cropStage) {
      setError('Please select a crop stage.');
      return;
    }
    if (!inspectorName.trim()) {
      setError('Inspector name is required.');
      return;
    }
    if (diseaseDetected && !diseaseName.trim()) {
      setError('Please enter the disease name.');
      return;
    }

    setLoading(true);

    try {
      const payload: Partial<FieldInspection> = {
        inspectionCode: `FI-${Date.now()}`,
        farmId,
        cropStage,
        inspectorName: inspectorName.trim(),
        healthScore,
        diseaseDetected,
        diseaseName: diseaseDetected ? diseaseName.trim() : undefined,
        notes: notes.trim() || undefined,
        photos: photos.map((photo) => photo.url),
        inspectionDate: new Date().toISOString().slice(0, 10),
        aiPrediction: generateAiPrediction({
          healthScore,
          diseaseDetected,
          diseaseName: diseaseDetected ? diseaseName.trim() : undefined,
        }),
      };

      await productionApi.createFieldInspection(payload);
      addToast('Field inspection recorded successfully', 'success');
      navigate('/inspections');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save inspection';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>New Field Inspection</h1>
          <p className={styles.subtitle}>Record crop health, disease, and pest observations from a farm visit.</p>
        </div>
        <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/inspections')}>
          Back to list
        </Button>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error ? <div className={styles.errorText}>{error}</div> : null}

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="farm">Farm</label>
              <select id="farm" className={styles.select} value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                <option value="">Select a farm</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="cropStage">Crop Stage</label>
              <select id="cropStage" className={styles.select} value={cropStage} onChange={(e) => setCropStage(e.target.value)}>
                <option value="">Select a crop stage</option>
                {cropStageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="inspectorName">Inspector Name</label>
            <Input
              id="inspectorName"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="e.g. Anitha Rao"
              errorText={!inspectorName.trim() && error ? 'Required' : undefined}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="healthScore">Health Score</label>
            <div className={styles.sliderRow}>
              <input
                id="healthScore"
                type="range"
                min={0}
                max={100}
                value={healthScore}
                onChange={(e) => setHealthScore(Number(e.target.value))}
                className={styles.slider}
              />
              <span className={`${styles.sliderValue} ${styles[healthScoreClass(healthScore)] ?? ''}`}>{healthScore}</span>
            </div>
            <span className={styles.helperText}>Green: above 80 · Yellow: 60–80 · Red: below 60</span>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxRow} htmlFor="diseaseDetected">
              <input
                id="diseaseDetected"
                type="checkbox"
                className={styles.checkbox}
                checked={diseaseDetected}
                onChange={(e) => setDiseaseDetected(e.target.checked)}
              />
              Disease Detected
            </label>
          </div>

          {diseaseDetected && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="diseaseName">Disease Name</label>
              <Input
                id="diseaseName"
                value={diseaseName}
                onChange={(e) => setDiseaseName(e.target.value)}
                placeholder="e.g. Bacterial Leaf Blight"
                errorText={diseaseDetected && !diseaseName.trim() && error ? 'Required' : undefined}
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations from the field visit…"
            />
          </div>

          <div className={styles.field}>
            <PhotoUpload
              photos={photos}
              onAdd={handleAddPhotos}
              onRemove={handleRemovePhoto}
              label="Photos"
              helpText="Optional — attach close-up photos of affected leaves, pests, or plants."
            />
          </div>

          <div className={styles.actions}>
            <Button leftIcon={Save} isLoading={loading} type="submit">
              Submit Inspection
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate('/inspections')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
