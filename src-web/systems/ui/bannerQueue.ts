/**
 * Core UI - the banner tier (gdd-06 A2 #1, A3, A6, AC-02/AC-42/AC-43).
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART A), plan.md P6 (reduced).
 *
 * Rules encoded here:
 * - at most ONE banner visible; the rest queue FIFO;
 * - a `WRITE_FAILED_*` banner PREEMPTS an open quota-warning banner, and the
 *   preempted quota banner goes back to the FRONT of the queue (it is not lost);
 * - banners are non-blocking, never modal, never self-navigating and render on
 *   EVERY screen;
 * - a banner NEVER auto-times-out (AC-43) - dismissal is always explicit, which
 *   is why this module owns no clock and starts no timer.
 *
 * Pure module: no React, no I/O, no clock.
 */

export type BannerKind =
  | 'WRITE_FAILED_QUOTA'
  | 'WRITE_FAILED_UNKNOWN'
  | 'QUOTA_WARNING'
  | 'BACKUP_PROMPT'
  | 'INFO';

export interface Banner {
  id: string;
  kind: BannerKind;
  /** Player-facing text (Vietnamese). */
  text: string;
}

/** Kinds that preempt an open quota warning (gdd-06 A3 `banner_queue`). */
export function isWriteFailure(kind: BannerKind): boolean {
  return kind === 'WRITE_FAILED_QUOTA' || kind === 'WRITE_FAILED_UNKNOWN';
}

export function isQuotaWarning(kind: BannerKind): boolean {
  return kind === 'QUOTA_WARNING';
}

export interface BannerQueueSnapshot {
  visible: Banner | null;
  queue: Banner[];
}

export class BannerQueue {
  private _visible: Banner | null = null;
  private _queue: Banner[] = [];

  get visible(): Banner | null {
    return this._visible;
  }

  /** Pending banners, front first. */
  get queued(): readonly Banner[] {
    return this._queue;
  }

  /** Total banners held (visible + queued). */
  get size(): number {
    return (this._visible ? 1 : 0) + this._queue.length;
  }

  /**
   * Enqueue. Returns the banner that ended up visible.
   *
   * The single preemption exception: a write-failure banner displaces an open
   * quota warning, and the quota warning returns to the FRONT of the queue.
   */
  push(banner: Banner): Banner | null {
    if (this._visible === null) {
      this._visible = banner;
      return this._visible;
    }
    if (isWriteFailure(banner.kind) && isQuotaWarning(this._visible.kind)) {
      this._queue.unshift(this._visible);
      this._visible = banner;
      return this._visible;
    }
    this._queue.push(banner);
    return this._visible;
  }

  /** Explicit dismissal; promotes the next queued banner. Never automatic. */
  dismiss(): Banner | null {
    this._visible = this._queue.shift() ?? null;
    return this._visible;
  }

  /** Removes a specific banner wherever it sits. */
  remove(id: string): boolean {
    if (this._visible?.id === id) {
      this.dismiss();
      return true;
    }
    const before = this._queue.length;
    this._queue = this._queue.filter((b) => b.id !== id);
    return this._queue.length !== before;
  }

  clear(): void {
    this._visible = null;
    this._queue = [];
  }

  snapshot(): BannerQueueSnapshot {
    return { visible: this._visible, queue: [...this._queue] };
  }

  /** The invariant every AC-02 assertion reduces to. */
  invariantHolds(): boolean {
    return this.size === 0 || this._visible !== null;
  }
}

export function createBannerQueue(): BannerQueue {
  return new BannerQueue();
}

/** Ready-made Vietnamese copy for the banners P3a/P6a can raise. */
export const BANNER_TEXT: Record<BannerKind, string> = {
  WRITE_FAILED_QUOTA: 'Không ghi được: bộ nhớ trình duyệt đã đầy.',
  WRITE_FAILED_UNKNOWN: 'Không ghi được tiến trình. Hãy sao lưu thủ công.',
  QUOTA_WARNING: 'Bộ nhớ sắp đầy — nên chép lại quyển sổ.',
  BACKUP_PROMPT: 'Đã lâu chưa sao lưu — nên chép lại quyển sổ.',
  INFO: '',
};
