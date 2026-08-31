import { useMemo } from 'react';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './EntryRankingsTable.module.css';

interface RankingItem {
  entryCode: string;
  entryName: string;
  meanYield: number;
  stdError: number;
  rank: number;
  lsdLetters: string;
}

interface TrialEntry {
  code: string;
  name: string;
  type: 'Candidate' | 'Check' | 'Control';
}

interface EntryRankingsTableProps {
  rankings: RankingItem[];
  entries: TrialEntry[];
}

export function EntryRankingsTable({ rankings, entries }: EntryRankingsTableProps) {
  
  // Merge entry type details with rankings
  const rankingsWithTypes = useMemo(() => {
    return rankings.map(r => {
      const matchedEntry = entries.find(e => e.code === r.entryCode);
      return {
        ...r,
        type: matchedEntry?.type || 'Candidate'
      };
    });
  }, [rankings, entries]);

  // Find the mean yield of the best check variety to use as baseline
  const bestCheckYield = useMemo(() => {
    const checks = rankingsWithTypes.filter(r => r.type === 'Check');
    if (checks.length === 0) return null;
    return Math.max(...checks.map(c => c.meanYield));
  }, [rankingsWithTypes]);

  // Calculate percentage vs best check
  const getVsCheckPct = (yieldVal: number) => {
    if (!bestCheckYield) return null;
    const diff = ((yieldVal - bestCheckYield) / bestCheckYield) * 100;
    return {
      value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`,
      isPositive: diff >= 0
    };
  };

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '80px' }}>Rank</th>
            <th style={{ width: '120px' }}>Code</th>
            <th>Name</th>
            <th style={{ width: '120px' }}>Type</th>
            <th style={{ width: '130px', textAlign: 'right' }}>Mean Yield</th>
            <th style={{ width: '100px', textAlign: 'right' }}>Std Error</th>
            <th style={{ width: '110px', textAlign: 'center' }}>LSD Letters</th>
            <th style={{ width: '140px', textAlign: 'right' }}>vs Best Check</th>
          </tr>
        </thead>
        <tbody>
          {rankingsWithTypes.map((item, idx) => {
            const isTop = idx === 0;
            const vsCheck = getVsCheckPct(item.meanYield);
            const isCheck = item.type === 'Check';

            return (
              <tr key={item.entryCode} className={`${styles.row} ${isTop ? styles.rowTop : ''}`}>
                <td className={styles.rankCell}>
                  {isTop ? (
                    <div className={styles.topRankArea}>
                      <Award size={18} className={styles.awardIcon} />
                      <span className={styles.rankNum}>{item.rank}</span>
                    </div>
                  ) : (
                    <span className={styles.normalRankNum}>{item.rank}</span>
                  )}
                </td>
                <td className={`${styles.codeCell} ${styles.mono}`}>{item.entryCode}</td>
                <td className={styles.nameCell}>
                  <div className={styles.nameWrap}>
                    <span className={styles.name}>{item.entryName}</span>
                    {isTop && <span className={styles.topLabel}>Best Performer</span>}
                  </div>
                </td>
                <td>
                  <span className={`${styles.typeChip} ${styles[item.type.toLowerCase()]}`}>
                    {item.type}
                  </span>
                </td>
                <td className={styles.yieldCell}>
                  <strong>{item.meanYield.toFixed(1)}</strong> <span className={styles.unit}>q/ha</span>
                </td>
                <td className={styles.errorCell}>
                  ±{item.stdError.toFixed(1)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={styles.lsdLetter}>{item.lsdLetters}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {isCheck ? (
                    <span className={styles.baselineLabel}>Baseline check</span>
                  ) : vsCheck ? (
                    <span className={`${styles.trend} ${vsCheck.isPositive ? styles.trendUp : styles.trendDown}`}>
                      {vsCheck.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>{vsCheck.value}</span>
                    </span>
                  ) : (
                    <span className={styles.muted}>-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
