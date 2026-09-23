// Seeded RNG (Mulberry32)
export class RNG {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  static fromState(state: number): RNG {
    return new RNG(state);
  }
  getState(): number {
    return this.s;
  }
  next(): number {
    // Keep the state a uint32. It used to grow as an unbounded double (only
    // ever read through 32-bit ops, so the draws were right), but getState()
    // then returned values above 2^32 that fromState truncates: a game
    // restored from a snapshot carried a different rngState than the live one
    // (found by scripts/polish/parity-fuzz.ts). The draws are bit-identical
    // either way; only the stored state is normalized.
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number) {
    return Math.floor(this.next() * n);
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }
  fork(): RNG {
    return new RNG(this.int(2 ** 31));
  }
}

export function makeSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
