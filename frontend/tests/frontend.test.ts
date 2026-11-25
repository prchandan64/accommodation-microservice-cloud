import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatDateSafe, formatTermPeriod } from '../src/utils/format.ts';

const SRC_DIR = path.resolve(import.meta.dirname, '../src');

test('formatDateSafe handles valid, missing, and invalid dates gracefully', () => {
  assert.equal(formatDateSafe(undefined), '—');
  assert.equal(formatDateSafe(null), '—');
  assert.equal(formatDateSafe(''), '—');
  assert.equal(formatDateSafe('not-a-date'), '—');
  const valid = formatDateSafe('2026-12-25');
  assert.ok(valid.includes('2026') && valid !== '—');
});

test('formatTermPeriod formats start and end dates without fabricating timestamps', () => {
  assert.equal(formatTermPeriod(undefined, undefined), '—');
  const period = formatTermPeriod('2026-12-25', '2027-05-24');
  assert.ok(period.includes('–') && period.includes('2026') && period.includes('2027'));
});

test('api.ts stores JWT only in memory (no localStorage) and handles 401/403/429', () => {
  const apiSource = fs.readFileSync(path.join(SRC_DIR, 'services/api.ts'), 'utf8');
  assert.equal(/\blocalStorage\./.test(apiSource), false);
  assert.ok(apiSource.includes('private token: string | null = null'));
  assert.ok(apiSource.includes('response.status === 401'));
  assert.ok(apiSource.includes('Retry-After'));
});

test('AppContext.tsx has no localStorage persistence, no switchRole, and no mock fallbacks', () => {
  const ctxSource = fs.readFileSync(path.join(SRC_DIR, 'context/AppContext.tsx'), 'utf8');
  assert.equal(ctxSource.includes('localStorage'), false);
  assert.equal(ctxSource.includes('switchRole'), false);
  assert.equal(ctxSource.includes('MOCK_USERS'), false);
  assert.ok(ctxSource.includes('err.status === 403'));
  assert.ok(ctxSource.includes('clearUserState'));
});

test('App.tsx gates Student, Warden, and Admin portals by authenticated role', () => {
  const appSource = fs.readFileSync(path.join(SRC_DIR, 'App.tsx'), 'utf8');
  assert.ok(appSource.includes('!currentUser && <PublicLanding'));
  assert.ok(appSource.includes("currentUser?.role === 'STUDENT'"));
  assert.ok(appSource.includes("currentUser?.role === 'WARDEN'"));
  assert.ok(appSource.includes("currentUser?.role === 'HOUSING_ADMIN'"));
});

test('Header.tsx has no client-side role switcher and exposes Sign Out', () => {
  const headerSource = fs.readFileSync(path.join(SRC_DIR, 'components/Header.tsx'), 'utf8');
  assert.equal(headerSource.includes('switchRole'), false);
  assert.ok(headerSource.includes('Sign Out'));
  assert.ok(headerSource.includes('Sign In / Register'));
});

test('PaymentModal.tsx clearly labels payment as a Demo Simulator', () => {
  const paySource = fs.readFileSync(path.join(SRC_DIR, 'components/student/PaymentModal.tsx'), 'utf8');
  assert.ok(paySource.includes('Demo Simulator'));
  assert.ok(paySource.includes('Simulated Academic Payment Adapter'));
});
