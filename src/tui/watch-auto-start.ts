/**
 * ABOUTME: Pure helpers for the --watch / --poll auto-refresh feature.
 * Decides whether a task-list refresh should trigger auto-execution when the
 * TUI is in a stopped-but-not-paused state.
 */

import type { RalphStatus } from './theme.js';

/**
 * Statuses that mean "the engine is stopped but the user did not pause it".
 * Auto-start (when --watch is enabled) only fires from one of these states.
 *
 * Mirrors the `s`-key handler in RunApp for the local engine: restart from
 * `stopped`/`idle`/`complete`. We intentionally exclude `error` — the user
 * should review the failure before auto-retrying, matching the existing
 * manual-resume behavior.
 */
export const AUTO_START_ELIGIBLE_STATUSES: ReadonlySet<RalphStatus> = new Set<RalphStatus>([
  'stopped',
  'idle',
  'complete',
]);

/**
 * Tracker statuses that represent a task we could auto-start work on.
 * Excludes `completed`, `cancelled`, and `blocked` — those wouldn't trigger
 * a meaningful auto-start.
 */
const ACTIONABLE_TRACKER_STATUSES: ReadonlySet<string> = new Set<string>([
  'open',
  'in_progress',
]);

export interface ActionableTaskDiff {
  /** IDs of all actionable (open or in_progress) tasks after the refresh. */
  actionableIds: Set<string>;
  /** True iff at least one new actionable task ID appeared since the last refresh. */
  hasNew: boolean;
}

/**
 * Compute the actionable-task ID set from a refreshed task list, and report
 * whether any of those IDs are new compared to the previous set.
 */
export function diffActionableTaskIds(
  prevIds: ReadonlySet<string>,
  nextTasks: ReadonlyArray<{ id: string; status: string }>
): ActionableTaskDiff {
  const actionableIds = new Set<string>();
  let hasNew = false;
  for (const task of nextTasks) {
    if (!ACTIONABLE_TRACKER_STATUSES.has(task.status)) continue;
    actionableIds.add(task.id);
    if (!prevIds.has(task.id)) {
      hasNew = true;
    }
  }
  return { actionableIds, hasNew };
}

/**
 * Decide whether the TUI should auto-start execution after a refresh.
 *
 * Returns true only when:
 *   - watch mode is enabled,
 *   - the refresh revealed at least one new actionable task, AND
 *   - the current TUI status is "stopped but not paused"
 *     (see AUTO_START_ELIGIBLE_STATUSES).
 */
export function shouldAutoStartOnRefresh(
  status: RalphStatus,
  watch: boolean,
  hasNewActionable: boolean
): boolean {
  if (!watch) return false;
  if (!hasNewActionable) return false;
  return AUTO_START_ELIGIBLE_STATUSES.has(status);
}
