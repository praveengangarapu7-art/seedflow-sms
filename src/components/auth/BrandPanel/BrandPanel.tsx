import styles from './BrandPanel.module.css';

/**
 * The seed-theme brand panel behind every auth screen.
 *
 * The artwork is not decoration picked at random: it is the seed lifecycle
 * this product actually tracks, drawn left to right — a dormant seed, a
 * germinating one, a seedling, and a mature plant carrying next season's seed
 * head. The caption strip underneath names the same four stages in the
 * product's own vocabulary, so the panel says what SeedSphere is for before
 * anyone has logged in.
 *
 * Everything is inline SVG and CSS: no image requests, so the panel paints
 * with the first render rather than popping in afterwards. The growth
 * animation loops slowly and quietly — grow, hold, fade, regrow — so the
 * panel reads as alive without competing with the form beside it. It is
 * switched off entirely under prefers-reduced-motion.
 */

/** Grains on the mature plant's seed head, alternating either side of the stem. */
const SEED_HEAD_GRAINS = [
  { x: 254, y: 74, r: -22 },
  { x: 267, y: 70, r: 22 },
  { x: 255, y: 62, r: -20 },
  { x: 267, y: 58, r: 20 },
  { x: 256, y: 50, r: -18 },
  { x: 266, y: 46, r: 18 },
  { x: 261, y: 37, r: 0 },
];

/** Seeds drifting up through the panel. Staggered so they never move as a block. */
const MOTES = [
  { cx: 40, cy: 150, rx: 3.2, ry: 4.6, delay: '0s', duration: '17s' },
  { cx: 96, cy: 96, rx: 2.4, ry: 3.4, delay: '3.5s', duration: '21s' },
  { cx: 176, cy: 62, rx: 2.8, ry: 4, delay: '7s', duration: '19s' },
  { cx: 226, cy: 128, rx: 2.2, ry: 3.2, delay: '11s', duration: '23s' },
  { cx: 300, cy: 92, rx: 3, ry: 4.2, delay: '14.5s', duration: '18s' },
];

const LIFECYCLE = [
  { stage: 'Seed', caption: 'Variety & lot registry' },
  { stage: 'Germination', caption: 'Lab testing' },
  { stage: 'Seedling', caption: 'Field production' },
  { stage: 'Harvest', caption: 'Certified traceability' },
];

export function BrandPanel() {
  return (
    <div className={styles.panel}>
      {/* Soil band and furrow rows sit behind everything, painted in CSS so
          they scale with the panel rather than with the artwork's viewBox. */}
      <div className={styles.soil} aria-hidden="true" />
      <div className={styles.sun} aria-hidden="true" />

      <div className={styles.top}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="SeedSphere" className={styles.brandImage} />
        </div>

        <p className={styles.tagline}>Smart seed management for modern agribusiness</p>

        <div className={styles.illustration}>
          <svg
            className={styles.illustrationSvg}
            viewBox="0 0 320 250"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* The "sphere" of SeedSphere — a horizon ring the whole lifecycle grows across. */}
            <circle className={styles.sphere} cx="168" cy="140" r="118" />
            <circle className={styles.sphereInner} cx="168" cy="140" r="86" />

            {/* Ground */}
            <line className={styles.ground} x1="8" y1="200" x2="312" y2="200" />
            <path className={styles.groundSoft} d="M8 208 Q 90 202 168 208 T 312 206" />

            {/* ---------------- Stage 1 — dormant seed ---------------- */}
            <g className={`${styles.stage} ${styles.stage1}`}>
              <ellipse className={styles.seed} cx="46" cy="212" rx="8" ry="5.5" transform="rotate(-12 46 212)" />
              <path className={styles.rootline} d="M46 217 q -3 8 1 15" />
            </g>

            {/* ---------------- Stage 2 — germinating ---------------- */}
            <g className={`${styles.stage} ${styles.stage2}`}>
              <ellipse className={styles.seed} cx="118" cy="209" rx="8" ry="5.5" transform="rotate(-6 118 209)" />
              <path className={styles.rootline} d="M118 214 q -2 10 -6 17 M118 214 q 4 9 9 14" />
              <path className={styles.stem} d="M118 204 C 118 190 116 180 119 172" />
              {/* The shoot's first curl, still hooked over as it breaks the surface */}
              <path className={styles.stem} d="M119 172 q 7 -6 12 -1" />
            </g>

            {/* ---------------- Stage 3 — seedling ---------------- */}
            <g className={`${styles.stage} ${styles.stage3}`}>
              <ellipse className={styles.seed} cx="190" cy="207" rx="7" ry="5" transform="rotate(8 190 207)" />
              <path className={styles.stem} d="M190 202 C 190 178 188 156 190 136" />
              <path
                className={styles.leaf}
                d="M190 158 C 178 155 166 147 158 136 C 170 139 183 147 190 158 Z"
              />
              <path
                className={styles.leaf}
                d="M190 146 C 202 143 214 135 222 124 C 210 127 197 135 190 146 Z"
              />
              <circle className={styles.tip} cx="190" cy="136" r="3.4" />
            </g>

            {/* ---------------- Stage 4 — mature plant, next season's seed ---------------- */}
            <g className={`${styles.stage} ${styles.stage4}`}>
              <path className={styles.stemThick} d="M261 200 C 261 168 258 122 261 80" />
              <path
                className={styles.leaf}
                d="M261 166 C 246 162 231 151 222 137 C 237 141 253 151 261 166 Z"
              />
              <path
                className={styles.leaf}
                d="M260 142 C 275 138 291 128 301 114 C 286 118 269 128 260 142 Z"
              />
              <path
                className={styles.leaf}
                d="M261 118 C 249 114 238 104 231 92 C 243 97 255 106 261 118 Z"
              />
              {SEED_HEAD_GRAINS.map((grain) => (
                <ellipse
                  key={`${grain.x}-${grain.y}`}
                  className={styles.grain}
                  cx={grain.x}
                  cy={grain.y}
                  rx="3.4"
                  ry="5.6"
                  transform={`rotate(${grain.r} ${grain.x} ${grain.y})`}
                />
              ))}
            </g>

            {/* Seeds carried on the air */}
            {MOTES.map((mote) => (
              <ellipse
                key={`${mote.cx}-${mote.cy}`}
                className={styles.mote}
                cx={mote.cx}
                cy={mote.cy}
                rx={mote.rx}
                ry={mote.ry}
                style={{ animationDelay: mote.delay, animationDuration: mote.duration }}
              />
            ))}
          </svg>
        </div>

        <ol className={styles.lifecycle}>
          {LIFECYCLE.map((step, index) => (
            <li key={step.stage} className={styles.lifecycleStep}>
              <span className={styles.lifecycleDot} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.lifecycleText}>
                <span className={styles.lifecycleStage}>{step.stage}</span>
                <span className={styles.lifecycleCaption}>{step.caption}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.footer}>Trusted by 500+ seed companies across India</div>
    </div>
  );
}
