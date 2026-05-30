/**
 * ABOUTME: Tests for the pure watch/poll auto-start helpers in watch-auto-start.ts.
 */

import { describe, expect, test } from 'bun:test';
import {
  AUTO_START_ELIGIBLE_STATUSES,
  diffActionableTaskIds,
  shouldAutoStartOnRefresh,
} from './watch-auto-start.js';
import type { RalphStatus } from './theme.js';

describe('diffActionableTaskIds', () => {
  test('reports hasNew=true when a new open task appears', () => {
    const prev = new Set<string>(['T-1']);
    const next = [
      { id: 'T-1', status: 'open' },
      { id: 'T-2', status: 'open' },
    ];
    const result = diffActionableTaskIds(prev, next);
    expect(result.hasNew).toBe(true);
    expect(result.actionableIds).toEqual(new Set(['T-1', 'T-2']));
  });

  test('reports hasNew=true when a new in_progress task appears', () => {
    const prev = new Set<string>();
    const next = [{ id: 'T-9', status: 'in_progress' }];
    const result = diffActionableTaskIds(prev, next);
    expect(result.hasNew).toBe(true);
    expect(result.actionableIds).toEqual(new Set(['T-9']));
  });

  test('reports hasNew=false when only completed tasks change', () => {
    const prev = new Set<string>(['T-1']);
    const next = [
      { id: 'T-1', status: 'open' },
      { id: 'T-2', status: 'completed' },
      { id: 'T-3', status: 'cancelled' },
    ];
    const result = diffActionableTaskIds(prev, next);
    expect(result.hasNew).toBe(false);
    expect(result.actionableIds).toEqual(new Set(['T-1']));
  });

  test('reports hasNew=false when the actionable set is unchanged', () => {
    const prev = new Set<string>(['T-1', 'T-2']);
    const next = [
      { id: 'T-1', status: 'open' },
      { id: 'T-2', status: 'in_progress' },
    ];
    const result = diffActionableTaskIds(prev, next);
    expect(result.hasNew).toBe(false);
    expect(result.actionableIds).toEqual(new Set(['T-1', 'T-2']));
  });

  test('reports hasNew=false when actionable tasks are removed', () => {
    const prev = new Set<string>(['T-1', 'T-2']);
    const next = [{ id: 'T-1', status: 'open' }];
    const result = diffActionableTaskIds(prev, next);
    expect(result.hasNew).toBe(false);
    expect(result.actionableIds).toEqual(new Set(['T-1']));
  });

  test('blocked tasks are not actionable', () => {
    const prev = new Set<string>();
    const next = [{ id: 'T-1', status: 'blocked' }];
    const result = diffActionableTaskIds(prev, next);
    expect(result.hasNew).toBe(false);
    expect(result.actionableIds.size).toBe(0);
  });
});

describe('shouldAutoStartOnRefresh', () => {
  const eligible: RalphStatus[] = ['stopped', 'idle', 'complete'];
  const ineligible: RalphStatus[] = [
    'ready',
    'running',
    'selecting',
    'executing',
    'pausing',
    'paused',
    // `error` is intentionally excluded — auto-retrying after an error would
    // mask real failures. The user must press `s` manually.
    'error',
  ];

  test('exports the eligible status set used by the predicate', () => {
    for (const status of eligible) {
      expect(AUTO_START_ELIGIBLE_STATUSES.has(status)).toBe(true);
    }
    for (const status of ineligible) {
      expect(AUTO_START_ELIGIBLE_STATUSES.has(status)).toBe(false);
    }
  });

  test('returns true for every eligible status when watch + new', () => {
    for (const status of eligible) {
      expect(shouldAutoStartOnRefresh(status, true, true)).toBe(true);
    }
  });

  test('returns false for every ineligible status even when watch + new', () => {
    for (const status of ineligible) {
      expect(shouldAutoStartOnRefresh(status, true, true)).toBe(false);
    }
  });

  test('returns false when watch is disabled', () => {
    expect(shouldAutoStartOnRefresh('idle', false, true)).toBe(false);
    expect(shouldAutoStartOnRefresh('stopped', false, true)).toBe(false);
  });

  test('returns false when there are no new actionable tasks', () => {
    expect(shouldAutoStartOnRefresh('idle', true, false)).toBe(false);
    expect(shouldAutoStartOnRefresh('complete', true, false)).toBe(false);
  });
});
