import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Activity, 
  Zap, 
  DoorOpen, 
  Battery, 
  Signal,
  MoreVertical
} from 'lucide-react';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { Badge } from '@/components/common/Badge/Badge';
import { LiveDot } from '../LiveDot/LiveDot';
import { IoTSensor, SensorType } from '@/types/warehouse';
import styles from './SensorsTable.module.css';

interface SensorsTableProps {
  sensors: IoTSensor[];
  onRowClick: (sensor: IoTSensor) => void;
}

export const SensorsTable: React.FC<SensorsTableProps> = ({ sensors, onRowClick }) => {
  const getTypeIcon = (type: SensorType) => {
    switch (type) {
      case 'Temperature': return <Thermometer size={16} />;
      case 'Humidity': return <Droplets size={16} />;
      case 'CO2': return <Wind size={16} />;
      case 'Air quality': return <Activity size={16} />;
      case 'Power meter': return <Zap size={16} />;
      case 'Door sensor': return <DoorOpen size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const columns = [
    { 
      key: 'id', 
      label: 'Sensor ID', 
      render: (s: IoTSensor) => <span className={styles.sensorId}>{s.id}</span> 
    },
    { 
      key: 'type', 
      label: 'Type', 
      render: (s: IoTSensor) => (
        <div className={styles.typeCol}>
          {getTypeIcon(s.type)}
          <span>{s.type}</span>
        </div>
      )
    },
    { key: 'zone', label: 'Zone' },
    { 
      key: 'status', 
      label: 'Status', 
      render: (s: IoTSensor) => (
        <div className={styles.statusCol}>
          <Badge variant={
            s.status === 'Online' ? 'success' : 
            s.status === 'Warning' ? 'warning' : 'danger'
          }>{s.status}</Badge>
          {s.status === 'Online' && <LiveDot />}
        </div>
      )
    },
    { 
      key: 'currentValue', 
      label: 'Current value', 
      align: 'right' as const,
      render: (s: IoTSensor) => <span className={styles.currentValue}>{s.currentValue}{s.unit}</span> 
    },
    { 
      key: 'battery', 
      label: 'Battery', 
      render: (s: IoTSensor) => (
        <div className={`${styles.batteryCol} ${s.batteryPct && s.batteryPct < 30 ? styles.batteryLow : ''}`}>
          <Battery size={14} />
          <span>{s.batteryPct}%</span>
        </div>
      )
    },
    { 
      key: 'signal', 
      label: 'Signal', 
      render: (s: IoTSensor) => (
        <div className={styles.signalCol}>
          <Signal size={14} />
          <div className={styles.signalBars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className={`${styles.bar} ${i < (s.signalStrength || 0) / 20 ? styles.barActive : ''}`} 
              />
            ))}
          </div>
        </div>
      )
    },
    { 
      key: 'lastReading', 
      label: 'Last reading', 
      render: (s: IoTSensor) => <span className={styles.lastReading}>{s.lastReadingAt}</span> 
    },
    { 
      key: 'actions', 
      label: '', 
      render: () => <button className={styles.moreBtn}><MoreVertical size={16} /></button> 
    }
  ];

  return (
    <div className={styles.wrapper}>
      <DataTable 
        columns={columns} 
        data={sensors} 
        onRowClick={onRowClick}
        rowKey="id"
      />
    </div>
  );
};
