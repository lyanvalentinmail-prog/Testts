/** Contadores en memoria de la instancia actual. */
const startedAt = Date.now();

const counters = {
  requests: 0,
  errors: 0,
  clientErrors: 0,
  serverErrors: 0,
  imagesGenerated: 0,
  providerCalls: 0,
  providerFailures: 0,
  totalDurationMs: 0,
  statusCodes: {} as Record<string, number>,
};

export const stats = {
  requestStarted(): void {
    counters.requests += 1;
  },
  requestFinished(status: number, durationMs: number): void {
    counters.totalDurationMs += durationMs;
    const key = String(status);
    counters.statusCodes[key] = (counters.statusCodes[key] ?? 0) + 1;
    if (status >= 500) {
      counters.errors += 1;
      counters.serverErrors += 1;
    } else if (status >= 400) {
      counters.errors += 1;
      counters.clientErrors += 1;
    }
  },
  imageGenerated(): void {
    counters.imagesGenerated += 1;
  },
  providerCall(): void {
    counters.providerCalls += 1;
  },
  providerFailure(): void {
    counters.providerFailures += 1;
  },
  snapshot() {
    return {
      startedAt: new Date(startedAt).toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      requests: counters.requests,
      errors: counters.errors,
      clientErrors: counters.clientErrors,
      serverErrors: counters.serverErrors,
      imagesGenerated: counters.imagesGenerated,
      providerCalls: counters.providerCalls,
      providerFailures: counters.providerFailures,
      averageDurationMs: counters.requests === 0 ? 0 : Math.round(counters.totalDurationMs / counters.requests),
      statusCodes: counters.statusCodes,
    };
  },
  reset(): void {
    counters.requests = 0;
    counters.errors = 0;
    counters.clientErrors = 0;
    counters.serverErrors = 0;
    counters.imagesGenerated = 0;
    counters.providerCalls = 0;
    counters.providerFailures = 0;
    counters.totalDurationMs = 0;
    counters.statusCodes = {};
  },
};
