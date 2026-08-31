import { useState } from 'react';
import { 
  FlaskConical, 
  ShoppingCart, 
  Warehouse, 
  Cog, 
  Microscope, 
  TrendingUp, 
  CheckCircle2 
} from 'lucide-react';
import styles from './OrbitalDiagram.module.css';

interface NodeData {
  id: string;
  name: string;
  x: number;
  y: number;
  icon: React.ComponentType<any>;
  delay: number;
}

export default function OrbitalDiagram() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Math-mapped nodes at 0, 72, 144, 216, 288 degrees on a radius of 220px around (300,300)
  const nodes: NodeData[] = [
    { id: 'rd', name: 'R&D', x: 300, y: 80, icon: FlaskConical, delay: 0 },
    { id: 'procurement', name: 'Procurement', x: 509, y: 232, icon: ShoppingCart, delay: 600 },
    { id: 'warehouse', name: 'Warehouse', x: 429, y: 478, icon: Warehouse, delay: 1200 },
    { id: 'processing', name: 'Processing', x: 171, y: 478, icon: Cog, delay: 1800 },
    { id: 'laboratory', name: 'Laboratory', x: 91, y: 232, icon: Microscope, delay: 2400 }
  ];

  return (
    <div className={styles.diagramContainer}>
      <svg viewBox="0 0 600 600" className={styles.svgElement}>
        {/* Definitions for gradients and shadows */}
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-warning)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-warning)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Decorative rotating outer orbital ring */}
        <circle 
          cx="300" 
          cy="300" 
          r="220" 
          fill="none" 
          stroke="rgba(14, 84, 103, 0.1)" 
          strokeDasharray="6 6" 
          className={styles.orbitRing} 
        />

        {/* Dynamic connecting lines */}
        {nodes.map((node) => {
          const isActive = hoveredNode === node.id;
          return (
            <g key={`line-${node.id}`}>
              {/* Radial glow background on hovered lines */}
              {isActive && (
                <line
                  x1="300"
                  y1="300"
                  x2={node.x}
                  y2={node.y}
                  stroke="rgba(245, 175, 18, 0.1)"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              )}
              {/* Dashed flowing line */}
              <line
                x1="300"
                y1="300"
                x2={node.x}
                y2={node.y}
                className={`${styles.connectingLine} ${isActive ? styles.connectingLineActive : ''}`}
              />
            </g>
          );
        })}

        {/* Continuous Flowing Particles along paths from outer to center */}
        {nodes.map((node) => (
          <circle 
            key={`particle-${node.id}`} 
            r="3.5" 
            className={styles.particle}
          >
            <animateMotion 
              dur="4.5s" 
              repeatCount="indefinite" 
              path={`M ${node.x} ${node.y} L 300 300`} 
              begin={`${node.delay}ms`}
            />
          </circle>
        ))}

        {/* Staggered Pulsing Rings behind each node */}
        {nodes.map((node) => (
          <circle
            key={`pulse-${node.id}`}
            cx={node.x}
            cy={node.y}
            r="40"
            className={styles.pulseRing}
            style={{ 
              animationDelay: `${node.delay}ms`,
              '--cx': `${node.x}px`,
              '--cy': `${node.y}px`
            } as React.CSSProperties}
          />
        ))}

        {/* Center Glassmorphic Dashboard Showcase */}
        <g className={styles.centerGroup}>
          {/* Main Card Surface with Shadow filter */}
          <rect
            x={300 - 90}
            y={300 - 60}
            width={180}
            height={120}
            rx={14}
            fill="rgba(255, 255, 255, 0.92)"
            stroke="var(--color-border-light)"
            strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 8px 24px rgba(14, 84, 103, 0.12))' }}
          />

          {/* Micro Dashboard UI items */}
          <rect x={225} y={255} width={40} height={6} rx={3} fill="var(--color-primary)" opacity="0.8" />
          <rect x={225} y={270} width={80} height={5} rx={2.5} fill="var(--color-border)" />
          <rect x={225} y={282} width={110} height={5} rx={2.5} fill="var(--color-border-light)" />
          
          {/* Progress bar 1 */}
          <rect x={225} y={298} width={130} height={8} rx={4} fill="var(--color-accent-light)" />
          <rect x={225} y={298} width={90} height={8} rx={4} fill="var(--color-primary)" />
          
          {/* Progress bar 2 */}
          <rect x={225} y={312} width={130} height={8} rx={4} fill="var(--color-accent-light)" />
          <rect x={225} y={312} width={110} height={8} rx={4} fill="var(--color-warning)" />

          {/* Sparkle and badge indicator */}
          <rect x={315} y={252} width={50} height={16} rx={8} fill="#E2F3EB" />
          <text x={340} y={264} fill="#2E8B5C" fontSize="10" fontWeight="800" textAnchor="middle">+8.4%</text>
        </g>

        {/* Orbiting Module Nodes */}
        {nodes.map((node) => {
          const Icon = node.icon;
          const isProcessing = node.id === 'processing';
          return (
            <g
              key={node.id}
              className={styles.nodeGroup}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                '--cx': `${node.x}px`,
                '--cy': `${node.y}px`
              } as React.CSSProperties}
            >
              {/* Outer Circular Node Background */}
              <circle
                cx={node.x}
                cy={node.y}
                r="40"
                className={styles.nodeCircle}
              />

              {/* Injecting Lucide react icon via foreignObject */}
              <foreignObject
                x={node.x - 20}
                y={node.y - 20}
                width="40"
                height="40"
                style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    color: hoveredNode === node.id ? 'var(--color-warning)' : 'var(--color-primary)',
                    transition: 'color 200ms ease',
                    animation: isProcessing ? 'spin 30s linear infinite' : 'none'
                  }}
                >
                  <Icon size={28} strokeWidth={2} />
                </div>
              </foreignObject>

              {/* Node Text Label below the circle */}
              <text
                x={node.x}
                y={node.y + 56}
                className={styles.nodeLabel}
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Style element for rotating the processing cog */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Floating HTML Metrics Cards */}
      <div className={`${styles.floatingCard} ${styles.card1}`}>
        <div className={styles.cardIcon} style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' }}>
          <FlaskConical size={14} />
        </div>
        <span>12 active trials</span>
      </div>

      <div className={`${styles.floatingCard} ${styles.card2}`}>
        <div className={styles.cardIcon} style={{ backgroundColor: 'rgba(230, 188, 66, 0.1)', color: 'var(--color-warning)' }}>
          <TrendingUp size={14} />
        </div>
        <span>₹2.4 L saved</span>
      </div>

      <div className={`${styles.floatingCard} ${styles.card3}`}>
        <div className={styles.cardIcon} style={{ backgroundColor: '#E2F3EB', color: '#2E8B5C' }}>
          <CheckCircle2 size={14} />
        </div>
        <span>98% accuracy</span>
      </div>
    </div>
  );
}
