import {
  calculateElapsedMinutes,
  formatDuration,
  formatLiveTimer,
  getLocalDateString,
  getPresetDateRange,
} from './time';

/**
 * Automated test suite for WorkTrack critical duration & date logic.
 * Can be executed with: npx tsx src/utils/time.test.ts
 */
function runTests() {
  console.log('--- Starting WorkTrack Time & Duration Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Duration Calculation Tests
  const start = new Date('2026-10-14T09:00:00Z');
  const end8h10m = new Date('2026-10-14T17:10:00Z');
  const elapsed = calculateElapsedMinutes(start, end8h10m);
  assert(elapsed === 490, `calculateElapsedMinutes accurately computes 490 minutes (got ${elapsed})`);

  // Negative or invalid range must return 0
  const negativeElapsed = calculateElapsedMinutes(end8h10m, start);
  assert(negativeElapsed === 0, `calculateElapsedMinutes returns 0 for inverted timestamps (got ${negativeElapsed})`);

  // 2. Duration Formatting Tests
  assert(formatDuration(490) === '8h 10m', `formatDuration(490) produces '8h 10m' (got '${formatDuration(490)}')`);
  assert(formatDuration(45) === '45m', `formatDuration(45) produces '45m' (got '${formatDuration(45)}')`);
  assert(formatDuration(0) === '0m', `formatDuration(0) produces '0m' (got '${formatDuration(0)}')`);
  assert(formatDuration(null) === '—', `formatDuration(null) produces '—' (got '${formatDuration(null)}')`);
  assert(formatDuration(undefined) === '—', `formatDuration(undefined) produces '—' (got '${formatDuration(undefined)}')`);

  // 3. Live Timer Formatting Tests
  assert(formatLiveTimer(0) === '00:00:00', `formatLiveTimer(0) produces '00:00:00'`);
  assert(formatLiveTimer(65) === '00:01:05', `formatLiveTimer(65) produces '00:01:05'`);
  assert(formatLiveTimer(3665) === '01:01:05', `formatLiveTimer(3665) produces '01:01:05'`);
  assert(formatLiveTimer(29400) === '08:10:00', `formatLiveTimer(29400) produces '08:10:00'`);

  // 4. Date formatting & Asia/Karachi local date
  const testDate = new Date('2026-10-14T12:00:00Z');
  const karachiDateStr = getLocalDateString(testDate, 'Asia/Karachi');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(karachiDateStr), `getLocalDateString produces YYYY-MM-DD pattern: ${karachiDateStr}`);

  // 5. Presets validation
  const todayRange = getPresetDateRange('today', 'Asia/Karachi');
  assert(todayRange.startDate === todayRange.endDate, `Today preset start and end match: ${todayRange.startDate}`);

  const weekRange = getPresetDateRange('this-week', 'Asia/Karachi');
  assert(weekRange.startDate <= weekRange.endDate, `This-week start <= end: ${weekRange.startDate} to ${weekRange.endDate}`);

  console.log(`--- Test Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
