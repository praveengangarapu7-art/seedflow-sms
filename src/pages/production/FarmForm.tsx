import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { masterDataApi, type Crop, type Farm, type Farmer } from '@/services/api';
import { useToast } from '@/components/common/Toast/ToastContext';
import { seedCrops, seedFarmers } from './cropPlanningData';
import { googleMapsUrl, irrigationTypeOptions, parseGpsCoordinates, soilTypeOptions } from './farmManagementData';
import styles from './production.module.css';

export default function FarmForm() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [farmers, setFarmers] = useState<Farmer[]>(seedFarmers);
  const [crops, setCrops] = useState<Crop[]>(seedCrops);

  const [name, setName] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [currentCrop, setCurrentCrop] = useState('');
  const [area, setArea] = useState('');
  const [location, setLocation] = useState('');
  const [soilType, setSoilType] = useState<string>(soilTypeOptions[0]);
  const [irrigationType, setIrrigationType] = useState<string>(irrigationTypeOptions[0]);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [farmersData, cropsData] = await Promise.all([masterDataApi.getFarmers(), masterDataApi.getCrops()]);
        setFarmers(Array.isArray(farmersData) && farmersData.length > 0 ? farmersData : seedFarmers);
        setCrops(Array.isArray(cropsData) && cropsData.length > 0 ? cropsData : seedCrops);
      } catch {
        setFarmers(seedFarmers);
        setCrops(seedCrops);
      }
    };

    void load();
  }, []);

  const gpsPreview = parseGpsCoordinates(latitude && longitude ? `${latitude}, ${longitude}` : undefined);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Farm name is required.');
      return;
    }
    if (!farmerId) {
      setError('Please select a farmer.');
      return;
    }
    if (!currentCrop) {
      setError('Please select a crop.');
      return;
    }
    const areaValue = Number(area);
    if (!area || Number.isNaN(areaValue) || areaValue <= 0) {
      setError('Area must be a positive number.');
      return;
    }
    if (!location.trim()) {
      setError('Location is required.');
      return;
    }
    if (!latitude || !longitude || !gpsPreview) {
      setError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    setLoading(true);

    try {
      const payload: Partial<Farm> = {
        name: name.trim(),
        farmerId,
        currentCrop,
        area: areaValue,
        location: location.trim(),
        soilType,
        irrigationType,
        gpsCoordinates: `${gpsPreview.lat}, ${gpsPreview.lng}`,
      };

      await masterDataApi.createFarm(payload);
      addToast('Farm created successfully', 'success');
      navigate('/farms');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save farm';
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
          <h1 className={styles.title}>Create Farm</h1>
          <p className={styles.subtitle}>Register a farm, link it to a farmer, and record field conditions.</p>
        </div>
        <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => navigate('/farms')}>
          Back to list
        </Button>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error ? <div className={styles.errorText}>{error}</div> : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">Farm Name</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramu's North Field"
              errorText={!name.trim() && error ? 'Required' : undefined}
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="farmer">Farmer</label>
              <select id="farmer" className={styles.select} value={farmerId} onChange={(e) => setFarmerId(e.target.value)}>
                <option value="">Select a farmer</option>
                {farmers.map((farmer) => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="crop">Crop</label>
              <select id="crop" className={styles.select} value={currentCrop} onChange={(e) => setCurrentCrop(e.target.value)}>
                <option value="">Select a crop</option>
                {crops.map((crop) => (
                  <option key={crop.id} value={crop.name}>
                    {crop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="area">Area (acres)</label>
              <Input
                id="area"
                type="number"
                min="0"
                step="0.1"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. 5.5"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="location">Location</label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Guntur, Andhra Pradesh"
                errorText={!location.trim() && error ? 'Required' : undefined}
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="soilType">Soil Type</label>
              <select id="soilType" className={styles.select} value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                {soilTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="irrigationType">Irrigation Type</label>
              <select
                id="irrigationType"
                className={styles.select}
                value={irrigationType}
                onChange={(e) => setIrrigationType(e.target.value)}
              >
                {irrigationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="latitude">Latitude</label>
              <Input
                id="latitude"
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 16.3067"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="longitude">Longitude</label>
              <Input
                id="longitude"
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 80.4365"
              />
            </div>
          </div>

          <div className={styles.mapBox}>
            <span className={styles.mapCoords}>
              <MapPin size={16} />
              {gpsPreview ? `${gpsPreview.lat}, ${gpsPreview.lng}` : 'Enter latitude & longitude to preview the location'}
            </span>
            {gpsPreview && (
              <a className={styles.mapLink} href={googleMapsUrl(gpsPreview)} target="_blank" rel="noopener noreferrer">
                Open in Google Maps ↗
              </a>
            )}
          </div>

          <div className={styles.actions}>
            <Button leftIcon={Save} isLoading={loading} type="submit">
              Create farm
            </Button>
            <Button variant="secondary" type="button" onClick={() => navigate('/farms')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
