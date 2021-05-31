// in-memory cache per process
export class Cache {

  private store: Record<string, ICacheItem> = {};

  async setItem(k: string, value: any, expireMs = 0) {
    const created = Date.now();
    const it: ICacheItem = { created, expireMs, value: JSON.stringify(value) };
    this.store[k] = it;
  }

  async getItem(k: string): Promise<any> {
    let value = null;
    const now = Date.now();
    if (this.store[k]) {
      const it = this.store[k];
      const temp = JSON.parse(it.value);
      if (it.expireMs) {
        if (now - it.created < it.expireMs) {
          value = temp;
        } else {
          this.store[k] = undefined; // expired
        }
      } else {
        value = temp;
      }
    }
    return value;
  }
}

export interface ICacheItem {
  value: string;
  expireMs: number;
  created: number;
}
