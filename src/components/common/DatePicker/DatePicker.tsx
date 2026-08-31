import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  value: string | null;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  showTime?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value, onChange, minDate, maxDate, placeholder = 'DD MMM YYYY', label, required, showTime
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [time, setTime] = useState(value && value.includes('T') ? value.split('T')[1].substring(0, 5) : '12:00');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplay = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (showTime && dateStr.includes('T')) {
      const t = dateStr.split('T')[1].substring(0, 5);
      const hours = parseInt(t.split(':')[0]);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 || 12;
      return `${datePart} ${h}:${t.split(':')[1]} ${ampm}`;
    }
    return datePart;
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, '0');
    const d = String(selected.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${d}`;
    
    if (showTime) {
      onChange(`${isoDate}T${time}`);
    } else {
      onChange(isoDate);
      setIsOpen(false);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    if (value) {
      const datePart = value.split('T')[0];
      onChange(`${datePart}T${newTime}`);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay} />);
    }
    
    const today = new Date();
    const selectedDate = value ? new Date(value) : null;
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      
      let isDisabled = false;
      if (minDate && date < new Date(minDate)) isDisabled = true;
      if (maxDate && date > new Date(maxDate)) isDisabled = true;

      days.push(
        <button
          key={d}
          type="button"
          onClick={(e) => { e.stopPropagation(); !isDisabled && handleDateSelect(d); }}
          className={`${styles.dayBtn} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
          disabled={isDisabled}
          aria-label={date.toDateString()}
        >
          {d}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {label && <label className={styles.label}>{label} {required && <span className={styles.required}>*</span>}</label>}
      <div className={styles.inputWrapper} onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          readOnly
          value={formatDisplay(value)}
          placeholder={placeholder}
          className={styles.input}
        />
        <Calendar className={styles.icon} size={18} />
      </div>
      
      {isOpen && (
        <div className={styles.dropdown} role="dialog">
          <div className={styles.header}>
            <button type="button" onClick={handlePrevMonth} className={styles.navBtn}><ChevronLeft size={18} /></button>
            <span className={styles.monthYear}>
              {currentMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={handleNextMonth} className={styles.navBtn}><ChevronRight size={18} /></button>
          </div>
          <div className={styles.weekdays}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className={styles.weekday}>{day}</div>
            ))}
          </div>
          <div className={styles.grid}>
            {renderCalendar()}
          </div>
          {showTime && (
            <div className={styles.timeSection} onClick={(e) => e.stopPropagation()}>
              <label>Time</label>
              <input 
                type="time" 
                value={time} 
                onChange={handleTimeChange} 
                className={styles.timeInput}
                step="900"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
