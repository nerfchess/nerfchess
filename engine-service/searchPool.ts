// A small worker_threads pool for the engine service (slice HB, P9).
//
// The service used to run one synchronous search at a time on its only
// thread, so a second human's bot waited behind the first one's whole search,
// timed out on the worker's 3s clock and fell back to an 80ms local search.
// Here every search runs on one of `size` threads, at most `queueLimit` more
// wait, and each request carries a deadline measured from its arrival:
//
//   - the search ceiling it gets is what is left of that deadline after its
//     queue wait, less a margin for the replay and the reply;
//   - the bot's clock ran while it waited, so remainingClockMs is charged the
//     wait too, and the graded budget in pickHouseMove sees the real clock;
//   - a request whose deadline is already too close is refused, not searched;
//   - a request whose client went away while it was queued is dropped;
//   - a full queue answers at once (the caller maps it to 503), so the worker
//     falls back to its local search immediately instead of after 3 seconds.
//
// A thread that crashes or overruns its deadline by `hangGraceMs` is replaced,
// so one bad position can never wedge the pool.
import { Worker } from "node:worker_threads";
import { REMOTE_SEARCH_CEILING_MS, type SearchResult, type SearchTask } from "./search";

/** Time kept back from the deadline for the replay before the search starts,
 * the king-safety pass after it, and the reply. */
export const DEADLINE_MARGIN_MS = 250;
/** Below this much search time a remote answer is not worth having: the
 * worker's own local search is as good and costs no round trip. */
export const MIN_SEARCH_MS = 20;

export type PoolOutcome =
  | { kind: "done"; result: SearchResult; queuedMs: number; searchMs: number }
  | { kind: "full" }
  | { kind: "expired"; queuedMs: number }
  | { kind: "aborted" }
  | { kind: "error"; message: string };

export interface PoolCounters {
  submitted: number;
  searched: number;
  rejectedFull: number;
  expiredInQueue: number;
  abortedBeforeStart: number;
  abortedWhileRunning: number;
  errors: number;
  threadRestarts: number;
}

type Job = {
  id: number;
  task: Omit<SearchTask, "ceilingMs">;
  arrivedAt: number;
  deadlineAt: number;
  resolve: (o: PoolOutcome) => void;
  aborted: boolean;
  startedAt?: number;
  detach?: () => void;
};

type Slot = {
  worker: Worker;
  job: Job | null;
  watchdog: ReturnType<typeof setTimeout> | null;
  spawnedAt: number;
  /** Crashed or terminated, waiting to be replaced: never given a job. */
  dead: boolean;
};

export interface PoolOptions {
  size: number;
  queueLimit: number;
  /** The script each thread runs (the bundled server.mjs re-enters itself). */
  workerUrl: URL;
  hangGraceMs?: number;
  now?: () => number;
}

export class SearchPool {
  readonly counters: PoolCounters = {
    submitted: 0,
    searched: 0,
    rejectedFull: 0,
    expiredInQueue: 0,
    abortedBeforeStart: 0,
    abortedWhileRunning: 0,
    errors: 0,
    threadRestarts: 0,
  };
  private readonly slots: Slot[] = [];
  private readonly queue: Job[] = [];
  private nextId = 1;
  private closed = false;
  private readonly now: () => number;
  private readonly hangGraceMs: number;

  constructor(private readonly opts: PoolOptions) {
    this.now = opts.now ?? Date.now;
    this.hangGraceMs = opts.hangGraceMs ?? 2000;
    for (let i = 0; i < Math.max(1, opts.size); i++) this.slots.push(this.spawn());
  }

  get size(): number {
    return this.slots.length;
  }

  get queued(): number {
    return this.queue.length;
  }

  get busy(): number {
    return this.slots.filter((s) => s.job && !s.dead).length;
  }

  /** Queue a search. `deadlineMs` is measured from now (the request's
   * arrival). `signal` aborts it while it waits (the client hung up). */
  submit(task: Omit<SearchTask, "ceilingMs">, deadlineMs: number, signal?: AbortSignal): Promise<PoolOutcome> {
    this.counters.submitted++;
    const arrivedAt = this.now();
    const free = this.slots.find((s) => !s.job && !s.dead);
    if (!free && this.queue.length >= this.opts.queueLimit) {
      this.counters.rejectedFull++;
      return Promise.resolve({ kind: "full" });
    }
    return new Promise<PoolOutcome>((resolve) => {
      const job: Job = { id: this.nextId++, task, arrivedAt, deadlineAt: arrivedAt + deadlineMs, resolve, aborted: false };
      if (signal) {
        const onAbort = () => this.abort(job);
        if (signal.aborted) {
          this.counters.abortedBeforeStart++;
          resolve({ kind: "aborted" });
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
        job.detach = () => signal.removeEventListener("abort", onAbort);
      }
      if (free) this.start(free, job);
      else this.queue.push(job);
    });
  }

  close(): Promise<unknown> {
    this.closed = true;
    for (const job of this.queue.splice(0)) this.finish(job, { kind: "aborted" });
    return Promise.all(this.slots.map((s) => s.worker.terminate()));
  }

  private abort(job: Job): void {
    if (job.aborted) return;
    job.aborted = true;
    const i = this.queue.indexOf(job);
    if (i >= 0) {
      this.queue.splice(i, 1);
      this.counters.abortedBeforeStart++;
      this.finish(job, { kind: "aborted" });
    } else if (job.startedAt != null) {
      // A synchronous search cannot be interrupted; it is bounded by its own
      // deadline, and its answer is simply dropped.
      this.counters.abortedWhileRunning++;
    }
  }

  private finish(job: Job, outcome: PoolOutcome): void {
    job.detach?.();
    job.detach = undefined;
    job.resolve(outcome);
  }

  private start(slot: Slot, job: Job): void {
    const now = this.now();
    const queuedMs = now - job.arrivedAt;
    const ceilingMs = Math.min(REMOTE_SEARCH_CEILING_MS, job.deadlineAt - now - DEADLINE_MARGIN_MS);
    if (ceilingMs < MIN_SEARCH_MS) {
      this.counters.expiredInQueue++;
      this.finish(job, { kind: "expired", queuedMs });
      this.pump();
      return;
    }
    const task: SearchTask = {
      ...job.task,
      ceilingMs: Math.floor(ceilingMs),
      // The bot's clock kept running while this request waited.
      ...(job.task.remainingClockMs != null
        ? { remainingClockMs: Math.max(0, job.task.remainingClockMs - queuedMs) }
        : {}),
    };
    job.startedAt = now;
    slot.job = job;
    this.counters.searched++;
    slot.watchdog = setTimeout(() => this.hung(slot), Math.max(0, job.deadlineAt - now) + this.hangGraceMs);
    slot.worker.postMessage({ id: job.id, task });
  }

  private pump(): void {
    if (this.closed) return;
    for (const slot of this.slots) {
      if (slot.job || slot.dead) continue;
      const job = this.queue.shift();
      if (!job) return;
      this.start(slot, job);
    }
  }

  private release(slot: Slot, outcome: PoolOutcome): void {
    const job = slot.job;
    if (slot.watchdog) clearTimeout(slot.watchdog);
    slot.watchdog = null;
    slot.job = null;
    if (job) this.finish(job, outcome);
    this.pump();
  }

  private hung(slot: Slot): void {
    this.counters.errors++;
    const job = slot.job;
    const i = this.slots.indexOf(slot);
    slot.dead = true;
    void slot.worker.terminate();
    if (i >= 0 && !this.closed) this.slots[i] = this.spawn(true);
    if (slot.watchdog) clearTimeout(slot.watchdog);
    slot.job = null;
    if (job) this.finish(job, { kind: "error", message: "search overran its deadline" });
    this.pump();
  }

  private spawn(restart = false): Slot {
    if (restart) this.counters.threadRestarts++;
    const worker = new Worker(this.opts.workerUrl);
    const slot: Slot = { worker, job: null, watchdog: null, spawnedAt: this.now(), dead: false };
    worker.on("message", (msg: { id: number; result?: SearchResult; error?: string }) => {
      const job = slot.job;
      if (!job || job.id !== msg.id) return;
      if (msg.error != null || !msg.result) {
        this.counters.errors++;
        this.release(slot, { kind: "error", message: msg.error ?? "no result" });
        return;
      }
      this.release(slot, {
        kind: "done",
        result: msg.result,
        queuedMs: (job.startedAt ?? job.arrivedAt) - job.arrivedAt,
        searchMs: this.now() - (job.startedAt ?? job.arrivedAt),
      });
    });
    const replace = (why: string) => {
      const i = this.slots.indexOf(slot);
      if (i < 0 || this.closed || slot.dead) return;
      slot.dead = true;
      const job = slot.job;
      if (slot.watchdog) clearTimeout(slot.watchdog);
      slot.job = null;
      if (job) {
        this.counters.errors++;
        this.finish(job, { kind: "error", message: why });
      }
      // A thread that dies right after starting would otherwise respawn in a
      // tight loop; wait a second before trying again.
      const quick = this.now() - slot.spawnedAt < 1000;
      const respawn = () => {
        if (this.closed || this.slots[i] !== slot) return;
        this.slots[i] = this.spawn(true);
        this.pump();
      };
      if (quick) setTimeout(respawn, 1000).unref?.();
      else respawn();
    };
    worker.on("error", (err) => replace(`thread error: ${String(err)}`));
    worker.on("exit", (code) => replace(`thread exited (${code})`));
    return slot;
  }
}
