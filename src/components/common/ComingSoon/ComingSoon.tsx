import { Card } from '../Card/Card';
import { Hourglass } from 'lucide-react';
import styles from './ComingSoon.module.css';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({ 
  title = "Content to be added soon", 
  description = "This section is currently under development. We're working hard to bring you the best experience!" 
}: ComingSoonProps) {
  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.content}>
          <Hourglass size={48} className={styles.icon} />
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </Card>
    </div>
  );
}
