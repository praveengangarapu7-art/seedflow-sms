import type { AiPhotoAnalysis } from './seedLotRealtimeClient';

/**
 * On-device colour screening for crop and seed photos.
 *
 * This is NOT a vision model. It runs in the browser, needs no key and sends
 * nothing anywhere: it classifies pixels by hue / saturation / brightness and
 * reports how much of the frame looks healthy, yellowed, browned, very dark
 * or pale/white. That is enough to give an inspector a consistent first
 * screening and a prompt to look closer, and it is labelled as such in the
 * result. When a vision model is configured on the server, the server's
 * analysis is used instead.
 */

export interface ColourShares {
  green: number; yellow: number; brown: number; dark: number; pale: number; other: number;
  /** 0..1 spread of hue among coloured pixels — low means a uniform sample. */
  hueSpread: number;
  sampled: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image'));
    img.src = src;
  });
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max / 255];
}

export function classifyPixels(data: Uint8ClampedArray): ColourShares {
  let green = 0, yellow = 0, brown = 0, dark = 0, pale = 0, other = 0, n = 0;
  const hues: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    n++;
    const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    if (v < 0.16) dark++;
    else if (v > 0.88 && s < 0.14) pale++;
    else if (s >= 0.2 && h >= 70 && h <= 170) { green++; hues.push(h); }
    else if (s >= 0.3 && h >= 42 && h < 70) { yellow++; hues.push(h); }
    else if (s >= 0.28 && h >= 12 && h < 42 && v < 0.62) { brown++; hues.push(h); }
    else other++;
  }
  const mean = hues.reduce((a, b) => a + b, 0) / (hues.length || 1);
  const variance = hues.reduce((a, b) => a + (b - mean) ** 2, 0) / (hues.length || 1);
  const t = n || 1;
  return { green: green / t, yellow: yellow / t, brown: brown / t, dark: dark / t, pale: pale / t, other: other / t,
    hueSpread: Math.min(1, Math.sqrt(variance) / 60), sampled: n };
}

type Finding = AiPhotoAnalysis['findings'][number];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const sev = (share: number, mild: number, high: number): Finding['severity'] =>
  share >= high ? 'high' : share >= mild ? 'medium' : 'low';

export function interpretShares(s: ColourShares, kind: 'field' | 'seed', crop?: string): AiPhotoAnalysis {
  const findings: Finding[] = [];
  const recommendations: string[] = [];
  const followUpTests: string[] = [];
  const subject = kind === 'field' ? 'Field crop photo' : 'Seed sample photo';

  if (kind === 'field') {
    const plant = s.green + s.yellow + s.brown;
    if (plant < 0.15) {
      return {
        configured: false, model: 'On-device colour screening', subject, cropGuess: crop ?? null, overallSeverity: 'none', findings: [],
        recommendations: ['Retake the photo closer to the leaves or canopy, in daylight, filling most of the frame.'],
        followUpTests: [],
        summary: `Only ${pct(plant)} of this frame looks like plant tissue, so it cannot be screened reliably.`,
      };
    }
    const yShare = s.yellow / plant, bShare = s.brown / plant, gShare = s.green / plant;
    if (yShare >= 0.08) {
      findings.push({ issue: 'Yellowing (possible chlorosis, nutrient stress or maturity)', severity: sev(yShare, 0.1, 0.3),
        confidence: Math.min(0.7, 0.35 + yShare), evidence: `${pct(yShare)} of the plant area is yellow-toned.` });
      recommendations.push('Check whether yellowing is uniform (nutrient / water stress) or patchy (disease, pests), and note the growth stage.');
      followUpTests.push('Leaf tissue or soil nutrient test if yellowing is widespread.');
    }
    if (bShare >= 0.04) {
      findings.push({ issue: 'Browning (possible necrosis, scorch or disease lesions)', severity: sev(bShare, 0.06, 0.2),
        confidence: Math.min(0.7, 0.4 + bShare), evidence: `${pct(bShare)} of the plant area is brown-toned.` });
      recommendations.push('Inspect browned areas up close for lesions, rings or pest damage, and rogue or mark affected plants if the field is a seed crop.');
      followUpTests.push('Send a symptomatic sample for pathology confirmation.');
    }
    if (s.pale >= 0.1) {
      findings.push({ issue: 'Pale or whitish patches (glare, powdery growth or residue)', severity: 'low', confidence: 0.35,
        evidence: `${pct(s.pale)} of the frame is very pale — could be sun glare or mildew-like growth.` });
      recommendations.push('Retake without direct glare to rule out reflection before concluding.');
    }
    if (!findings.length) {
      recommendations.push(`Canopy colour looks healthy (${pct(gShare)} of plant area is green). Continue routine field inspection.`);
    }
  } else {
    const coloured = 1 - s.dark - s.pale;
    if (s.dark >= 0.12) {
      findings.push({ issue: 'Dark or discoloured seed (possible fungal damage, weathering or foreign matter)', severity: sev(s.dark, 0.12, 0.3),
        confidence: Math.min(0.65, 0.35 + s.dark), evidence: `${pct(s.dark)} of the sample is very dark.` });
      recommendations.push('Separate dark seed and compare its share to the purity limit; confirm with a blotter or health test.');
      followUpTests.push('Seed health (blotter) test and purity analysis.');
    }
    if (s.brown >= 0.15) {
      findings.push({ issue: 'Brown or stained seed coat (possible weathering or discolouration)', severity: sev(s.brown, 0.15, 0.4),
        confidence: Math.min(0.6, 0.3 + s.brown), evidence: `${pct(s.brown)} of the sample is brown-toned.` });
      recommendations.push('Check against the variety description; stained seed often scores lower on vigour.');
      followUpTests.push('Vigour test (accelerated ageing or cold test).');
    }
    if (s.pale >= 0.08) {
      findings.push({ issue: 'Pale or white areas (possible mould, coating residue or glare)', severity: sev(s.pale, 0.08, 0.2),
        confidence: 0.4, evidence: `${pct(s.pale)} of the frame is very pale.` });
      recommendations.push('Retake on a dark, matt tray without glare; if pale growth persists, treat it as possible mould and test seed health.');
    }
    if (s.hueSpread > 0.55 && coloured > 0.3) {
      findings.push({ issue: 'Mixed colours across the sample (possible off-types or mixture)', severity: 'low', confidence: 0.35,
        evidence: 'Seed colours vary widely across the frame.' });
      followUpTests.push('Physical purity and varietal purity (grow-out) check.');
    }
    if (!findings.length) recommendations.push('Seed colour looks uniform and clean in this photo. Rely on the lab germination and purity results for certification.');
  }

  const order = { none: 0, low: 1, medium: 2, high: 3 } as const;
  const overall = findings.reduce<Finding['severity']>((m, f) => (order[f.severity] > order[m] ? f.severity : m), 'none');
  const headline = findings.length
    ? `On-device screening flagged ${findings.length} point${findings.length === 1 ? '' : 's'} to check: ${findings.map((f) => f.issue.split(' (')[0].toLowerCase()).join(', ')}.`
    : 'On-device screening found nothing unusual in the colours of this photo.';
  return {
    configured: false, model: 'On-device colour screening', subject, cropGuess: crop ?? null, overallSeverity: overall, findings,
    recommendations, followUpTests,
    summary: `${headline} This is a colour-based screening that runs in your browser, not a visual diagnosis; connect a vision model for crop-specific analysis.`,
  };
}

export async function screenPhoto(previewDataUrl: string, kind: 'field' | 'seed', crop?: string): Promise<AiPhotoAnalysis> {
  const img = await loadImage(previewDataUrl);
  const side = 192;
  const scale = Math.min(1, side / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available in this browser');
  ctx.drawImage(img, 0, 0, w, h);
  return interpretShares(classifyPixels(ctx.getImageData(0, 0, w, h).data), kind, crop);
}
