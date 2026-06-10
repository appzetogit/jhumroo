import React, { useState, useEffect, useRef } from 'react';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// Format YYYY-MM-DD → DD/MM/YYYY for display
const formatDisplay = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};

// --- Calendar Popup ---
const CalendarPopup = ({ mode, startDate, endDate, onSelect, onClose, isDarkMode }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYmd = today.toISOString().split('T')[0];

  const initDate = mode === 'start'
    ? (startDate ? new Date(startDate) : new Date())
    : (endDate ? new Date(endDate) : startDate ? new Date(startDate) : new Date());

  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()); // 0-indexed
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build days grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pad = (n) => String(n).padStart(2, '0');
  const cellYmd = (d) => `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;

  const isToday = (d) => cellYmd(d) === todayYmd;
  const isPast = (d) => cellYmd(d) < todayYmd;
  const isBeforeStart = (d) => mode === 'end' && startDate && cellYmd(d) <= startDate;
  const isStart = (d) => cellYmd(d) === startDate;
  const isEnd = (d) => cellYmd(d) === endDate;
  const isInRange = (d) => {
    if (!startDate || !endDate) return false;
    const ymd = cellYmd(d);
    return ymd > startDate && ymd < endDate;
  };

  const bg = isDarkMode ? '#1A1A1A' : '#fff';
  const textPrimary = isDarkMode ? '#fff' : '#111';
  const textMuted = isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const rangeBg = isDarkMode ? 'rgba(254,44,85,0.15)' : 'rgba(254,44,85,0.08)';
  const hoverBg = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '110%',
        left: 0,
        right: 0,
        zIndex: 9999,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 22,
        boxShadow: '0 24px 70px rgba(0,0,0,0.3)',
        padding: '20px',
        userSelect: 'none',
      }}
    >
      {/* Month / Year Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: textPrimary, padding: '6px 10px', borderRadius: 12 }}
        >
          <BiChevronLeft size={26} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 18, color: textPrimary }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: textPrimary, padding: '6px 10px', borderRadius: 12 }}
        >
          <BiChevronRight size={26} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 8 }}>
        {DAYS.map(d => (
          <span key={d} style={{ fontSize: 13, fontWeight: 700, color: textMuted, paddingBottom: 6 }}>{d}</span>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px 0' }}>
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const disabled = isPast(d) || isBeforeStart(d);
          const start = isStart(d);
          const end = isEnd(d);
          const inRange = isInRange(d);
          const today_ = isToday(d);
          const selected = start || end;

          return (
            <button
              key={i}
              onClick={() => !disabled && onSelect(cellYmd(d))}
              style={{
                height: 44,
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: selected ? 800 : today_ ? 700 : 500,
                fontSize: 16,
                color: disabled
                  ? textMuted
                  : selected
                  ? '#fff'
                  : today_
                  ? '#FE2C55'
                  : textPrimary,
                background: selected
                  ? '#FE2C55'
                  : inRange
                  ? rangeBg
                  : 'transparent',
                borderRadius: start ? '50% 0 0 50%' : end ? '0 50% 50% 0' : selected ? '50%' : inRange ? 0 : 8,
                opacity: disabled ? 0.35 : 1,
                position: 'relative',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!disabled && !selected) e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={(e) => { if (!disabled && !selected) e.currentTarget.style.background = inRange ? rangeBg : 'transparent'; }}
            >
              {d}
              {today_ && !selected && (
                <span style={{
                  position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                  width: 5, height: 5, borderRadius: '50%', background: '#FE2C55',
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Main AdCalendarPicker ---
const AdCalendarPicker = ({ startDate, endDate, onStartChange, onEndChange, isDarkMode }) => {
  const [openPicker, setOpenPicker] = useState(null); // 'start' | 'end' | null
  const containerRef = useRef(null);

  const handleSelect = (ymd) => {
    if (openPicker === 'start') {
      onStartChange(ymd);
      if (endDate && ymd >= endDate) onEndChange('');
      setOpenPicker('end'); // auto-open end picker
    } else if (openPicker === 'end') {
      if (ymd > startDate) {
        onEndChange(ymd);
        setOpenPicker(null);
      }
    }
  };

  const textPrimary = isDarkMode ? '#fff' : '#111';
  const textMuted = isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.38)';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const activeBorder = 'rgba(254,44,85,0.5)';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger row: two buttons side by side */}
      <div style={{ display: 'flex', gap: 10 }}>
        {/* Start Date Button */}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
            Start Date
          </label>
          <button
            type="button"
            onClick={() => setOpenPicker(openPicker === 'start' ? null : 'start')}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 14,
              border: `1.5px solid ${openPicker === 'start' ? activeBorder : startDate ? activeBorder : borderColor}`,
              background: cardBg,
              color: startDate ? textPrimary : textMuted,
              fontSize: 15,
              fontWeight: startDate ? 700 : 400,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: 16 }}>📅</span>
            <span>{startDate ? formatDisplay(startDate) : 'DD/MM/YYYY'}</span>
          </button>
        </div>

        {/* End Date Button */}
        <div style={{ flex: 1, opacity: !startDate ? 0.4 : 1, pointerEvents: !startDate ? 'none' : 'auto' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
            End Date
          </label>
          <button
            type="button"
            onClick={() => setOpenPicker(openPicker === 'end' ? null : 'end')}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 14,
              border: `1.5px solid ${openPicker === 'end' ? activeBorder : endDate ? activeBorder : borderColor}`,
              background: cardBg,
              color: endDate ? textPrimary : textMuted,
              fontSize: 15,
              fontWeight: endDate ? 700 : 400,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: 16 }}>📅</span>
            <span>{endDate ? formatDisplay(endDate) : 'DD/MM/YYYY'}</span>
          </button>
        </div>
      </div>

      {/* Full-width calendar popup — spans both buttons */}
      {openPicker && (
        <CalendarPopup
          mode={openPicker}
          startDate={startDate}
          endDate={endDate}
          onSelect={handleSelect}
          onClose={() => setOpenPicker(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default AdCalendarPicker;
