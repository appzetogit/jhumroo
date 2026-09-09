import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight, BiInfoCircle } from 'react-icons/bi';
import { useTheme } from '../../../../context/ThemeContext';
import userService from '../../../../services/userService';
import {
  getWeeklyStats,
  ensureInitialScreenTimeData,
  formatDuration,
} from '../../../../utils/screenTimeTracker';

const ScreenTimePage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = last week, etc.
  const [stats, setStats] = useState(() => getWeeklyStats(0));
  const [selectedDay, setSelectedDay] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load real screen time stats from backend with local fallback
  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      try {
        setLoading(true);
        const res = await userService.getScreenTime(weekOffset);
        if (isMounted && res.success && res.stats) {
          setStats(res.stats);
          return;
        }
      } catch (err) {
        // Fallback to local tracked data
      } finally {
        if (isMounted) setLoading(false);
      }
      if (isMounted) {
        setStats(getWeeklyStats(weekOffset));
      }
    };

    fetchRealData();

    return () => {
      isMounted = false;
    };
  }, [weekOffset]);

  // Listen for local updates as well
  useEffect(() => {
    const handleUpdate = () => {
      setStats(getWeeklyStats(weekOffset));
    };
    window.addEventListener('screenTimeUpdated', handleUpdate);
    return () => {
      window.removeEventListener('screenTimeUpdated', handleUpdate);
    };
  }, [weekOffset]);

  // Compute dynamic chart y-axis max scale
  const rawMax = Math.max(...(stats?.days || []).map((d) => d.totalMinutes || 0), 1);
  const chartMax = Math.max(Math.ceil(rawMax / 15) * 15, 60);
  const ySteps = [1, 0.8, 0.6, 0.4, 0.2, 0];

  return (
    <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
      {/* ======================= HEADER ======================= */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 relative">
        <div
          className="theme-icon-button w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
          onClick={() => navigate(-1)}
        >
          <BiChevronLeft size={24} className="theme-text-primary opacity-80" />
        </div>
        <h2 className="theme-text-primary text-[17px] font-bold absolute left-0 right-0 text-center tracking-wide">
          Screen time
        </h2>
        <div className="w-10"></div>
      </div>

      <div className="scrollable flex-1 px-4 pb-16 pt-2">
        {/* ======================= DAILY AVERAGE SECTION (Screenshot 2) ======================= */}
        <div className="mb-6 px-1">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-[14px] font-semibold">Daily average</span>
            <button
              onClick={() => setShowInfoModal(true)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
              aria-label="Info"
            >
              <BiInfoCircle size={16} />
            </button>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-[34px] font-extrabold text-black dark:text-white tracking-tight leading-none">
              {formatDuration(stats?.dailyAverage || 0)}
            </span>
            {stats?.percentDiff ? (
              <span
                className={`text-[13px] font-semibold flex items-center gap-0.5 ${
                  stats.percentDiff > 0
                    ? 'text-emerald-500'
                    : 'text-rose-500'
                }`}
              >
                <span>{stats.percentDiff > 0 ? '▲' : '▼'}</span>
                <span>{Math.abs(stats.percentDiff)}% from last week</span>
              </span>
            ) : (
              <span className="text-[13px] font-semibold text-gray-400 dark:text-gray-500">
                0% from last week
              </span>
            )}
          </div>
        </div>

        {/* ======================= WEEK RANGE SELECTOR (Screenshot 2) ======================= */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
            aria-label="Previous Week"
          >
            <BiChevronLeft size={20} />
          </button>

          <span className="text-[16px] font-bold text-black dark:text-white tracking-wide min-w-[140px] text-center">
            {stats.weekLabel}
          </span>

          <button
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              weekOffset === 0
                ? 'bg-transparent text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40'
                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 active:scale-95 cursor-pointer'
            }`}
            aria-label="Next Week"
          >
            <BiChevronRight size={20} />
          </button>
        </div>

        {/* ======================= WEEKLY BAR CHART (Screenshot 2) ======================= */}
        <div className="mb-6 px-1">
          <div className="relative h-48 flex">
            {/* Y-Axis scale labels on left */}
            <div className="flex flex-col justify-between text-[11px] font-medium text-gray-400 dark:text-gray-500 pr-2 select-none h-40">
              {ySteps.map((step, idx) => (
                <span key={idx} className="text-right">
                  {step === 0 ? '0m' : formatDuration(Math.round(chartMax * step))}
                </span>
              ))}
            </div>

            {/* Chart Area with Dotted Grid Lines */}
            <div className="relative flex-1 h-40 flex flex-col justify-between">
              {/* Horizontal Grid lines */}
              {ySteps.map((_, idx) => (
                <div
                  key={idx}
                  className="w-full border-b border-dashed border-gray-200 dark:border-white/10"
                />
              ))}

              {/* Stacked Bars Container */}
              <div className="absolute inset-0 flex items-end justify-between px-2 pt-2">
                {(stats?.days || []).map((day, idx) => {
                  const totalRatio = (day.totalMinutes || 0) / chartMax;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDay(day)}
                      className="group flex flex-col items-center flex-1 cursor-pointer h-full justify-end relative"
                    >
                      {/* Tooltip on active / tap */}
                      {selectedDay?.dateKey === day.dateKey && (
                        <div className="absolute -top-10 z-20 bg-black/90 text-white text-[10px] font-semibold py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap animate-fade-in pointer-events-none">
                          <div>Total: {formatDuration(day.totalMinutes)}</div>
                          <div className="text-[9px] text-gray-300 font-normal">
                            Day: {formatDuration(day.dayMinutes)} | Night: {formatDuration(day.nightMinutes)}
                          </div>
                        </div>
                      )}

                      {/* Stacked Bar Column */}
                      {day.totalMinutes > 0 ? (
                        <div
                          style={{ height: `${Math.max(Math.min(totalRatio * 100, 100), 4)}%` }}
                          className="w-4 sm:w-5 flex flex-col justify-end rounded-t-sm overflow-hidden transition-all duration-300 group-hover:opacity-80 shadow-xs"
                        >
                          {/* Night time segment (Cyan #00E5FF) on top */}
                          {day.nightMinutes > 0 && (
                            <div
                              style={{
                                height: `${(day.nightMinutes / (day.totalMinutes || 1)) * 100}%`,
                              }}
                              className="w-full bg-[#00E5FF] transition-all duration-500"
                            />
                          )}
                          {/* Day time segment (Blue #0066FF) on bottom */}
                          {day.dayMinutes > 0 && (
                            <div
                              style={{
                                height: `${(day.dayMinutes / (day.totalMinutes || 1)) * 100}%`,
                              }}
                              className="w-full bg-[#0066FF] transition-all duration-500"
                            />
                          )}
                        </div>
                      ) : (
                        /* Empty baseline placeholder if 0m */
                        <div className="w-4 sm:w-5 h-[2px] bg-gray-300 dark:bg-white/20" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X-Axis Day Labels below chart */}
          <div className="flex justify-between pl-8 pr-2 pt-2 text-[12px] font-medium text-gray-500 dark:text-gray-400 select-none">
            {(stats?.days || []).map((day, idx) => (
              <span
                key={idx}
                className={`flex-1 text-center ${
                  day.isToday && weekOffset === 0
                    ? 'font-bold text-black dark:text-white'
                    : ''
                }`}
              >
                {day.label}
              </span>
            ))}
          </div>

          {/* Legend below chart (Screenshot 2) */}
          <div className="flex items-center justify-center gap-6 mt-5 text-[12px] font-semibold text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0066FF]" />
              <span>Day time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" />
              <span>Night time</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================= MODAL: INFO MODAL ======================= */}
      {showInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#1C1E2E] rounded-[24px] p-6 text-black dark:text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-[17px] font-bold mb-2">About Daily Average</h4>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              Daily average is calculated by dividing your total screen time for the selected week by 7 days. Day time is recorded between 6:00 AM and 10:00 PM, while Night time is recorded from 10:00 PM to 6:00 AM.
            </p>
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-3 rounded-xl font-bold bg-[#FE2C55] text-white active:scale-98 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenTimePage;
