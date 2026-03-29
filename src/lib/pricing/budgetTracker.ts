export class BudgetTracker {
  private spentUsd = 0;

  constructor(private readonly limitUsd: number | null) {}

  record(cost: number): void {
    this.spentUsd += cost;
  }

  hasExceeded(): boolean {
    return this.limitUsd !== null && this.spentUsd >= this.limitUsd;
  }

  get spent(): number {
    return this.spentUsd;
  }

  get limit(): number | null {
    return this.limitUsd;
  }

  get remaining(): number | null {
    return this.limitUsd === null
      ? null
      : Math.max(0, this.limitUsd - this.spentUsd);
  }
}
