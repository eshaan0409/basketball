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

/** JSON file on disk. Writes are serialized and atomic (write to temp, then rename). */
export class FileStore extends MemoryStore {
  private loaded: Promise<void> | null = null;
  private writing: Promise<void> = Promise.resolve();

  constructor(private readonly file: string) {
    super();
  }

  private load(): Promise<void> {
    if (!this.loaded) {
      this.loaded = (async () => {
        try {
          const data = JSON.parse(await fs.readFile(this.file, "utf8")) as { profiles: Profile[] };
          for (const p of data.profiles) this.profiles.set(p.id, p);
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        }
      })();
    }
    return this.loaded;
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
    await this.load();
    await super.save(profile);
    const snapshot = JSON.stringify({ profiles: [...this.profiles.values()] });
    this.writing = this.writing.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, snapshot, "utf8");
      await fs.rename(tmp, this.file);
    });
    await this.writing;
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

let shared: Store | null = null;

/** The app's store. VOUCHED_DATA_FILE overrides the location; serverless hosts fall back to /tmp (not durable). */
export function getStore(): Store {
  if (!shared) {
    const file =
      process.env.VOUCHED_DATA_FILE ??
      (process.env.VERCEL ? "/tmp/vouched.json" : path.join(process.cwd(), ".data", "vouched.json"));
    shared = new FileStore(file);
  }
  return shared;
}

export function storageIsDurable(): boolean {
  return !process.env.VERCEL || !!process.env.VOUCHED_DATA_FILE;
}
