// All date/time formatting uses IST (Asia/Kolkata, UTC+5:30)
const IST: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };

const toDate = (d: Date | string | null | undefined): Date => {
  if (!d) return new Date();
  return typeof d === 'string' ? new Date(d) : d;
};

/** "15 Jan 2025" */
export const formatDate = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleDateString('en-IN', { ...IST, year: 'numeric', month: 'short', day: 'numeric' });
};

/** "02:30 PM" */
export const formatTime = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleTimeString('en-IN', { ...IST, hour: '2-digit', minute: '2-digit', hour12: true });
};

/** "15 Jan 2025, 02:30 PM" */
export const formatDateTime = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleString('en-IN', {
    ...IST,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/** "15 Jan, 2:30 PM" — compact for cards */
export const formatDateTimeShort = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleString('en-IN', {
    ...IST,
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

/** "15/01/2025" */
export const formatDateGB = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleDateString('en-GB', { ...IST, day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** "15 Jan" */
export const formatDateShort = (date: Date | string): string => {
  const d = toDate(date);
  return d.toLocaleDateString('en-IN', { ...IST, month: 'short', day: 'numeric' });
};

/** "2m ago", "3h ago", "2d ago" */
export const getRelativeTime = (date: Date | string): string => {
  const d = toDate(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
};

/** "2m", "3h" — ultra-compact for badges */
export const getRelativeTimeShort = (date: Date | string): string => {
  const d = toDate(date);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

export const isToday = (date: Date | string): boolean => {
  const d = toDate(date);
  const todayStr = new Date().toLocaleDateString('en-IN', IST);
  return d.toLocaleDateString('en-IN', IST) === todayStr;
};

export const isThisWeek = (date: Date | string): boolean => {
  const d = toDate(date);
  return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
};

export const isThisMonth = (date: Date | string): boolean => {
  const d = toDate(date);
  return d >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
};

/** Current IST time as ISO string (for sending to backend) */
export const nowIST = (): string => new Date().toISOString();
