import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LANDING_PAGE_PATHNAME,
  SHELL_NAV_ACTIONS,
  SHELL_NAV_SECTIONS,
  shouldBypassAppShell,
} from './app-shell';

test('app shell keeps landing-page bypass behavior', () => {
  assert.equal(LANDING_PAGE_PATHNAME, '/');
  assert.equal(shouldBypassAppShell('/'), true);
  assert.equal(shouldBypassAppShell('/teacher'), false);
  assert.equal(shouldBypassAppShell('/teacher/new'), false);
  assert.equal(shouldBypassAppShell(null), false);
});

test('app shell defines expected nav actions for shell shortcuts', () => {
  assert.deepEqual(SHELL_NAV_ACTIONS, [
    { label: 'Õpetaja', href: '/teacher', tone: 'muted' },
    { label: 'Uus ülesanne', href: '/teacher/new', tone: 'primary' },
  ]);
});

test('header and footer reuse the same nav action source', () => {
  assert.strictEqual(SHELL_NAV_SECTIONS.header, SHELL_NAV_ACTIONS);
  assert.strictEqual(SHELL_NAV_SECTIONS.footer, SHELL_NAV_ACTIONS);
  assert.strictEqual(SHELL_NAV_SECTIONS.header, SHELL_NAV_SECTIONS.footer);
});
