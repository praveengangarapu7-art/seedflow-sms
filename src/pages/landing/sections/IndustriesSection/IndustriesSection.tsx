import { 
  Building2, 
  Landmark, 
  Microscope, 
  Wheat, 
  BadgeCheck, 
  Globe 
} from 'lucide-react';
import styles from './IndustriesSection.module.css';

interface IndustryCard {
  title: string;
  desc: string;
  icon: React.ComponentType<any>;
  tags: string[];
}

export default function IndustriesSection() {
  const industries: IndustryCard[] = [
    {
      title: 'Commercial Seed Companies',
      desc: 'Multi-state seed producers and distributors managing thousands of lots per season. SeedSphere handles their entire pipeline — from contract grower management to dispatch.',
      icon: Building2,
      tags: ['Procurement', 'Processing', 'Lab']
    },
    {
      title: 'Public Sector Corporations',
      desc: 'State Seed Corporations (NSC, SSCs) handling massive certified seed production, distribution contracts, and subsidy audits for state distribution programs.',
      icon: Landmark,
      tags: ['Certification', 'Compliance', 'Audit']
    },
    {
      title: 'Agricultural Institutions',
      desc: 'ICAR institutes, agricultural universities, and ICRISAT-style research centers running multi-location trials and managing complex germplasm collections.',
      icon: Microscope,
      tags: ['R&D', 'Trials', 'Germplasm']
    },
    {
      title: 'Contract Growing Networks',
      desc: 'Aggregators and field agents managing local farmer networks for seed multiplication. SeedSphere tracks every grower profile, GPS plot, and intake receipt.',
      icon: Wheat,
      tags: ['Procurement', 'Traceability']
    },
    {
      title: 'Seed Certification Agencies',
      desc: 'State Seed Certification Agencies and accredited bodies verifying seed lots against ISTA, ICAR, and state-specific physical and genetic quality standards.',
      icon: BadgeCheck,
      tags: ['Lab', 'Certifications', 'Audit Logs']
    },
    {
      title: 'Hybrid Seed Exporters',
      desc: 'Companies exporting premium Indian hybrid seeds to international markets, requiring strict quality documentation, phytosanitary logs, and IP protections.',
      icon: Globe,
      tags: ['QR Codes', 'Compliance', 'IP Filings']
    }
  ];

  const complianceChips = [
    'ICAR',
    'ISTA',
    'PPV&FRA',
    'UPOV',
    'ICRISAT Protocols',
    'State SCA Standards'
  ];

  return (
    <section id="industries" className={styles.section}>
      <div className={styles.container}>
        
        {/* Section Header */}
        <div className={styles.header}>
          <span className={styles.label}>Who Uses SeedSphere</span>
          <h2 className={styles.title}>Built for every player in the seed industry.</h2>
          <p className={styles.subtitle}>
            From multi-state seed companies to research institutions and contract producers, SeedSphere serves every link in India's seed supply chain.
          </p>
        </div>

        {/* 3x2 Grid containing Cards */}
        <div className={styles.grid}>
          {industries.map((ind, idx) => {
            const Icon = ind.icon;
            return (
              <div 
                key={ind.title} 
                className={`${styles.card} reveal`}
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                {/* Visual Icon */}
                <div className={styles.iconBox}>
                  <Icon size={26} strokeWidth={2} />
                </div>

                {/* Typography */}
                <h3 className={styles.cardTitle}>{ind.title}</h3>
                <p className={styles.cardDesc}>{ind.desc}</p>

                {/* Sub Tags */}
                <div className={styles.tagsRow}>
                  {ind.tags.map((tag) => (
                    <span key={tag} className={styles.tagChip}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Compliance Strip */}
        <div className={styles.complianceStrip}>
          <span className={styles.complianceLabel}>Built for compliance with:</span>
          <div className={styles.chipsList}>
            {complianceChips.map((chip) => (
              <span key={chip} className={styles.complianceChip}>
                {chip}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
export { IndustriesSection };
