export const createSnapshot = ({ spot, futures, optionChain, candles }) => Object.freeze({
  spot,
  futures,
  optionChain,
  candles,
  timestamp: Date.now()
});

export class SnapshotBuffer {
  constructor(limit = 60) {
    this.limit = limit;
    this.items = [];
  }

  push(snapshot) {
    this.items.push(snapshot);
    if (this.items.length > this.limit) this.items.shift();
  }

  getAll() {
    return [...this.items];
  }

  last() {
    return this.items[this.items.length - 1] || null;
  }

  at(indexFromEnd) {
    const index = this.items.length - 1 - indexFromEnd;
    return this.items[index] || null;
  }
}
