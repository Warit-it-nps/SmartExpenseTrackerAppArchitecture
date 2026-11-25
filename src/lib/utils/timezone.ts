export const THAI_TIMEZONE = 'Asia/Bangkok';

/**
 * คืนค่าวันที่ปัจจุบันตามเวลาประเทศไทย ในรูปแบบ 'YYYY-MM-DD'
 */
export function getBangkokDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: THAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * คืนค่าเดือนและปีปัจจุบันตามเวลาประเทศไทย ในรูปแบบ 'YYYY-MM'
 */
export function getBangkokMonthYear(date: Date = new Date()): string {
  return getBangkokDateString(date).slice(0, 7);
}

/**
 * แปลงตัวเลขเป็นฟอร์แมตสกุลเงินบาท (THB)
 */
export function formatTHB(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}
