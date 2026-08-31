import styles from './LogoStrip.module.css';

export default function LogoStrip() {
  const logos = [
    'ICAR',
    'IARI',
    'NBPGR',
    'NSC',
    'IIRR',
    'CICR',
    'ICRISAT',
    'TNAU',
    'NSAI',
    'IFFCO'
  ];

  // Duplicate logos array to facilitate seamless looping scroll
  const marqueeLogos = [...logos, ...logos];

  return (
    <section className={styles.container}>
      <h3 className={styles.caption}>Trusted by India's Seed Industry</h3>
      
      <div className={styles.marqueeWrapper}>
        <div className={styles.track}>
          {marqueeLogos.map((logo, index) => (
            <div 
              key={`logo-${index}`} 
              className={styles.logoItem}
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
