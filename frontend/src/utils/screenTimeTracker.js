// Screen time tracking utility

const SCREEN_TIME_DATA_KEY = 'jhumroo_screen_time_data_v3';
const SCREEN_TIME_SETTINGS_KEY = 'jhumroo_screen_time_settings_v3';

// Helper: Format date key 'YYYY-MM-DD'
export const getDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getScreenTimeData = () => {
  try {
    const raw = localStorage.getItem(SCREEN_TIME_DATA_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.error('Error reading screen time data:', e);
    return {};
  }
};

export const saveScreenTimeData = (data) => {
  try {
    localStorage.setItem(SCREEN_TIME_DATA_KEY, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('screenTimeUpdated', { detail: data }));
    }
  } catch (e) {
    console.error('Error saving screen time data:', e);
  }
};

// Return tracked activity data without injecting any fake mock entries
export const ensureInitialScreenTimeData = () => {
  return getScreenTimeData();
};

// Increment screen time for today (seconds or minutes)
export const recordScreenTimeMinutes = (minutes = 1) => {
  if (minutes <= 0) return;
  const data = getScreenTimeData();
  const todayKey = getDateKey();
  const now = new Date();
  const currentHour = now.getHours();
  // Daytime: 06:00 to 21:59 (6 AM to 10 PM), Nighttime: 22:00 to 05:59
  const isNight = currentHour >= 22 || currentHour < 6;

  const currentToday = data[todayKey] || { dayMinutes: 0, nightMinutes: 0, totalMinutes: 0 };

  if (isNight) {
    currentToday.nightMinutes = (currentToday.nightMinutes || 0) + minutes;
  } else {
    currentToday.dayMinutes = (currentToday.dayMinutes || 0) + minutes;
  }
  currentToday.totalMinutes = (currentToday.dayMinutes || 0) + (currentToday.nightMinutes || 0);

  data[todayKey] = currentToday;
  saveScreenTimeData(data);
};

// Helper: Get start of week (Sunday) for a given date
export const getWeekRange = (offsetWeeks = 0) => {
  const now = new Date();
  now.setDate(now.getDate() - offsetWeeks * 7);

  const dayOfWeek = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// Format a date range label like "Sep 6 – Sep 12"
export const formatWeekRangeLabel = (start, end) => {
  const options = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  return `${startStr} – ${endStr}`;
};

// Generate 7-day stats for a given week offset (0 = current week, 1 = previous week)
export const getWeeklyStats = (offsetWeeks = 0) => {
  const { start, end } = getWeekRange(offsetWeeks);
  const data = ensureInitialScreenTimeData();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayKey = getDateKey();

  const days = [];
  let totalWeekMinutes = 0;
  let activeDaysCount = 0;

  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = getDateKey(current);
    const dayData = data[key] || { dayMinutes: 0, nightMinutes: 0, totalMinutes: 0 };

    const isToday = key === todayKey;
    const dayLabel = isToday ? 'Today' : daysOfWeek[current.getDay()];

    const dayMins = dayData.dayMinutes || 0;
    const nightMins = dayData.nightMinutes || 0;
    const totalMins = dayMins + nightMins;

    if (totalMins > 0) {
      activeDaysCount++;
    }
    totalWeekMinutes += totalMins;

    days.push({
      dateKey: key,
      date: current,
      dayName: daysOfWeek[current.getDay()],
      label: dayLabel,
      isToday,
      dayMinutes: dayMins,
      nightMinutes: nightMins,
      totalMinutes: totalMins,
    });
  }

  // Daily average for 7 days
  const dailyAverage = Math.round(totalWeekMinutes / 7);

  // Compare with previous week
  const prevWeekRange = getWeekRange(offsetWeeks + 1);
  let prevTotalMinutes = 0;
  for (let i = 0; i < 7; i++) {
    const prevDate = new Date(prevWeekRange.start);
    prevDate.setDate(prevWeekRange.start.getDate() + i);
    const prevKey = getDateKey(prevDate);
    const pData = data[prevKey] || { dayMinutes: 0, nightMinutes: 0, totalMinutes: 0 };
    prevTotalMinutes += (pData.dayMinutes || 0) + (pData.nightMinutes || 0);
  }

  const prevDailyAvg = Math.round(prevTotalMinutes / 7);
  let percentDiff = 0;
  if (prevDailyAvg > 0) {
    percentDiff = Math.round(((dailyAverage - prevDailyAvg) / prevDailyAvg) * 100);
  } else if (dailyAverage > 0) {
    percentDiff = 100;
  }

  return {
    weekLabel: formatWeekRangeLabel(start, end),
    startDate: start,
    endDate: end,
    days,
    totalWeekMinutes,
    dailyAverage,
    percentDiff,
    maxMinutesInDay: Math.max(...days.map((d) => d.totalMinutes), 1),
  };
};

// Format minutes into clean human readable string "1h 24m" or "45m" or "0m"
export const formatDuration = (mins = 0) => {
  if (!mins || mins <= 0) return '0m';
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMins}m`;
};

export default {
  getDateKey,
  getScreenTimeData,
  saveScreenTimeData,
  ensureInitialScreenTimeData,
  recordScreenTimeMinutes,
  getWeekRange,
  formatWeekRangeLabel,
  getWeeklyStats,
  formatDuration,
};
