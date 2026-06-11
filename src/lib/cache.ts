type Clock = () => number;

export class TTLCache<T> {
  private entries = new Map<string, { value: T; storedAt: number; ttlMs: number }>();

  constructor(private now: Clock = Date.now) {}

  set(key: string, value: T, ttlMs: number) {
    this.entries.set(key, { value, storedAt: this.now(), ttlMs });
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.now() - entry.storedAt > entry.ttlMs) return undefined;
    return entry.value;
  }

  getStale(key: string): { value: T; ageMs: number } | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    return { value: entry.value, ageMs: this.now() - entry.storedAt };
  }
}

export class RateBudget {
  private timestamps: number[] = [];

  constructor(
    private limit: number,
    private windowMs: number,
    private now: Clock = Date.now,
  ) {}

  tryConsume(): boolean {
    const cutoff = this.now() - this.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
    if (this.timestamps.length >= this.limit) return false;
    this.timestamps.push(this.now());
    return true;
  }
}
