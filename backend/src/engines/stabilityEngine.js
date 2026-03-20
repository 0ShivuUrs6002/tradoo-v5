class StabilityEngine {
  constructor() {
    this.pendingDirection = null;
    this.pendingCount = 0;
    this.lastStablePayload = null;
    this.uiFrozenUntil = 0;
  }

  run(payload) {
    const direction = payload?.coherence?.coherentDirection || 'NEUTRAL';

    if (this.pendingDirection === direction) {
      this.pendingCount += 1;
    } else {
      this.pendingDirection = direction;
      this.pendingCount = 1;
    }

    const now = Date.now();
    const confirmed = this.pendingCount >= 3;

    if (confirmed && now >= this.uiFrozenUntil) {
      this.lastStablePayload = payload;
      this.uiFrozenUntil = now + 5000;
      return {
        payload,
        updated: true,
        frozenUntil: this.uiFrozenUntil
      };
    }

    return {
      payload: this.lastStablePayload || payload,
      updated: false,
      frozenUntil: this.uiFrozenUntil
    };
  }
}

export const stabilityEngine = new StabilityEngine();
