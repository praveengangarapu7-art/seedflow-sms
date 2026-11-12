import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './FeaturedSection.module.css';

/**
 * Featured: editorial content. Edit the arrays below to publish new items;
 * nothing here is fetched, so the section works on the public landing page.
 */
type Item = { tag: string; title: string; text: string; link?: string; linkLabel?: string };

const TRENDS: Item[] = [
  { tag: 'Breeding', title: 'Gene-edited & climate-resilient varieties', text: 'Breeders are using precision editing and marker-assisted selection to ship drought, heat and salinity tolerant varieties faster than conventional cycles.' },
  { tag: 'Traceability', title: 'Seed-to-shelf digital traceability', text: 'QR and lot-genealogy records are becoming the norm for certification, recalls and buyer confidence, from foundation seed to the retail packet.', link: '/login', linkLabel: 'See lot genealogy in SeedSphere' },
  { tag: 'Quality', title: 'AI-assisted lab and germination analysis', text: 'Image analysis and risk scoring help labs flag low-vigour lots and purity drift before seed reaches the farmer.', link: '/login', linkLabel: 'Explore the AI Center' },
  { tag: 'Crops', title: 'Millets and nutri-cereals revival', text: 'Demand for millets, pulses and orphan crops is opening new seed lines and certification volumes beyond the major cereals.' },
  { tag: 'Biologicals', title: 'Seed treatment and biologicals', text: 'Bio-stimulants, microbial seed coatings and reduced-chemical treatments are moving from trials into mainstream product lines.' },
  { tag: 'Digital ag', title: 'Precision and satellite-guided farming', text: 'Remote sensing and field-photo diagnostics connect seed performance back to real field outcomes for the next breeding cycle.' },
];

const COLLABS: Item[] = [
  { tag: 'Research', title: 'Public–private breeding partnerships', text: 'Seed companies co-develop varieties with agricultural universities and national research institutes, sharing germplasm and multi-location trial data.' },
  { tag: 'Field activity', title: 'Farmer field days and demo plots', text: 'On-farm demonstrations and field days put new hybrids in front of growers, and feed their feedback straight into R&D.' },
  { tag: 'Training', title: 'Seed producer and dealer training', text: 'Joint programmes train contract growers and dealers on isolation distance, roguing, storage and handling to protect seed quality.' },
  { tag: 'Certification', title: 'Certification and testing alliances', text: 'Accredited-lab and certification-agency collaboration keeps lot testing aligned with national and international standards.' },
  { tag: 'Sustainability', title: 'Farmer producer organisation networks', text: 'Seed village and FPO models widen access to quality seed while giving growers a stable procurement channel.' },
  { tag: 'Innovation', title: 'Agri-tech and startup pilots', text: 'Pilots with agri-tech teams test sensors, drones and analytics on real seed production and processing lines.' },
];

export default function FeaturedSection() {
  const [tab, setTab] = useState<'trends' | 'collabs'>('trends');
  const items = tab === 'trends' ? TRENDS : COLLABS;

  return (
    <section className={styles.section} aria-labelledby="featured-title">
      <div className={styles.container}>
        <div className={`${styles.header} reveal`}>
          <span className={styles.label}>Featured</span>
          <h2 id="featured-title" className={styles.title}>What is moving seed and agriculture</h2>
          <p className={styles.subtitle}>New trends shaping the industry, and the collaborations and field activities that put them to work.</p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Featured topics">
          <button role="tab" aria-selected={tab === 'trends'} className={`${styles.tab} ${tab === 'trends' ? styles.active : ''}`} onClick={() => setTab('trends')}>Global trends</button>
          <button role="tab" aria-selected={tab === 'collabs'} className={`${styles.tab} ${tab === 'collabs' ? styles.active : ''}`} onClick={() => setTab('collabs')}>Collaborations &amp; activities</button>
        </div>

        <div className={styles.grid} role="tabpanel">
          {items.map((it) => (
            <article key={it.title} className={styles.card}>
              <span className={styles.tag}>{it.tag}</span>
              <h3 className={styles.cardTitle}>{it.title}</h3>
              <p className={styles.cardText}>{it.text}</p>
              {it.link && <Link to={it.link} className={styles.cardLink}>{it.linkLabel} →</Link>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
