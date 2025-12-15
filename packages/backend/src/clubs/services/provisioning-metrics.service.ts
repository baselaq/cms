import { Injectable } from '@nestjs/common';

export interface ProvisioningMetricsSnapshot {
  total: number;
  success: number;
  failure: number;
  lastDurationMs: number;
  averageDurationMs: number;
}

@Injectable()
export class ProvisioningMetricsService {
  private total = 0;
  private success = 0;
  private failure = 0;
  private lastDurationMs = 0;
  private totalDurationMs = 0;

  record(successful: boolean, durationMs: number): void {
    this.total += 1;
    this.lastDurationMs = durationMs;
    this.totalDurationMs += durationMs;

    if (successful) {
      this.success += 1;
    } else {
      this.failure += 1;
    }
  }

  snapshot(): ProvisioningMetricsSnapshot {
    const averageDurationMs =
      this.total > 0 ? Math.round(this.totalDurationMs / this.total) : 0;

    return {
      total: this.total,
      success: this.success,
      failure: this.failure,
      lastDurationMs: this.lastDurationMs,
      averageDurationMs,
    };
  }
}
