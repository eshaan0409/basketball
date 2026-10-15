import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Profile } from "./types";

/**
 * Persistence boundary. The file store is for local use and demos; production needs a database
 * implementation of this same interface (Postgres via Supabase is the plan).
 */
export interface Store {
  getByOwnerHash(hash: string): Promise<Profile | null>;
  getByRequestToken(token: string): Promise<Profile | null>;
  getByShareToken(token: string): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
}

export class MemoryStore implements Store {
  protected profiles = new Map<string, Profile>();

  async getByOwnerHash(hash: string) {
    for (const p of this.profiles.values()) if (p.ownerHash === hash) return clone(p);
    return null;
  }
  async getByRequestToken(token: string) {
    for (const p of this.profiles.values()) if (p.requests.some((r) => r.token === token)) return clone(p);
    return null;
  }
  async getByShareToken(token: string) {
    for (const p of this.profiles.values()) if (p.shares.some((s) => s.token === token)) return clone(p);
    return null;
  }
  async save(profile: Profile) {
    this.profiles.set(profile.id, clone(profile));
  }
}

/**
 * JSON file on disk. Writes are serialized and atomic (write to temp, then rename). Reads re-load the
 * file whenever it changed on disk, because Next.js can hold several copies of this module (one per
 * route bundle) and each must see the others' writes.
 */
const writeLocks = ((globalThis as typeof globalThis & { __vouchedLocks?: Map<string, Promise<void>> }).__vouchedLocks ??=
  new Map<string, Promise<void>>());

export class FileStore extends MemoryStore {
  private version = "";

  constructor(private readonly file: string) {
    super();
  }

  private async load(): Promise<void> {
    let stamp = "";
    try {
      const st = await fs.stat(this.file);
      stamp = `${st.mtimeMs}:${st.size}`;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (stamp === this.version) return;
    this.profiles.clear();
    if (stamp) {
      const data = JSON.parse(await fs.readFile(this.file, "utf8")) as { profiles: Profile[] };
      for (const p of data.profiles) this.profiles.set(p.id, p);
    }
    this.version = stamp;
  }

  override async getByOwnerHash(hash: string) {
    await this.load();
    return super.getByOwnerHash(hash);
  }
  override async getByRequestToken(token: string) {
    await this.load();
    return super.getByRequestToken(token);
  }
  override async getByShareToken(token: string) {
    await this.load();
    return super.getByShareToken(token);
  }
  override async save(profile: Profile) {
    // Serialize read-modify-write per file across every instance in this process, so concurrent
    // saves never drop each other's changes. (Multiple processes need a real database.)
    const previous = writeLocks.get(this.file) ?? Promise.resolve();
    const run = previous.then(async () => {
      await this.load();
      await super.save(profile);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify({ profiles: [...this.profiles.values()] }), "utf8");
      await fs.rename(tmp, this.file);
      const st = await fs.stat(this.file);
      this.version = `${st.mtimeMs}:${st.size}`;
    });
    writeLocks.set(this.file, run.catch(() => undefined));
    await run;
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

const globalForStore = globalThis as typeof globalThis & { __vouchedStore?: Store };

/**
 * The app's store, one per process (kept on globalThis so every route bundle shares it).
 * VOUCHED_DATA_FILE overrides the location; serverless hosts fall back to /tmp, which is not durable.
 */
export function getStore(): Store {
  if (!globalForStore.__vouchedStore) {
    const file =
      process.env.VOUCHED_DATA_FILE ??
      (process.env.VERCEL ? "/tmp/vouched.json" : path.join(process.cwd(), ".data", "vouched.json"));
    globalForStore.__vouchedStore = new FileStore(file);
  }
  return globalForStore.__vouchedStore;
}

export function storageIsDurable(): boolean {
  return !process.env.VERCEL || !!process.env.VOUCHED_DATA_FILE;
}
