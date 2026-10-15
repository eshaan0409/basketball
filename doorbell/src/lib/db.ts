import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Booking, Message, Shop } from "./types";

export interface Data {
  shops: Shop[];
  bookings: Booking[];
  messages: Message[];
}

/**
 * Whole-dataset transactions: read a snapshot, or update under a lock. Small and simple on purpose; a Postgres
 * implementation of the same two methods replaces it when the data outgrows a file.
 */
export interface Db {
  read<T>(fn: (data: Readonly<Data>) => T): Promise<T>;
  update<T>(fn: (data: Data) => T): Promise<T>;
}

const empty = (): Data => ({ shops: [], bookings: [], messages: [] });

export class MemoryDb implements Db {
  protected data: Data = empty();
  private lock: Promise<unknown> = Promise.resolve();

  async read<T>(fn: (data: Readonly<Data>) => T): Promise<T> {
    await this.refresh();
    return fn(structuredClone(this.data));
  }

  async update<T>(fn: (data: Data) => T): Promise<T> {
    const run = this.lock.then(async () => {
      await this.refresh();
      const draft = structuredClone(this.data);
      const result = fn(draft);
      this.data = draft;
      await this.persist();
      return result;
    });
    this.lock = run.catch(() => undefined);
    return run;
  }

  protected async refresh(): Promise<void> {}
  protected async persist(): Promise<void> {}
}

/** JSON file, re-read when it changes on disk (Next.js may hold several copies of this module). */
export class FileDb extends MemoryDb {
  private version = "";

  constructor(private readonly file: string) {
    super();
  }

  protected override async refresh() {
    let stamp = "";
    try {
      const st = await fs.stat(this.file);
      stamp = `${st.mtimeMs}:${st.size}`;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (stamp === this.version) return;
    this.data = stamp ? { ...empty(), ...JSON.parse(await fs.readFile(this.file, "utf8")) } : empty();
    this.version = stamp;
  }

  protected override async persist() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data), "utf8");
    await fs.rename(tmp, this.file);
    const st = await fs.stat(this.file);
    this.version = `${st.mtimeMs}:${st.size}`;
  }
}

const g = globalThis as typeof globalThis & { __doorbellDb?: Db };

/** One database per process, shared by every route bundle. DOORBELL_DATA_FILE overrides the location. */
export function getDb(): Db {
  if (!g.__doorbellDb) {
    const file =
      process.env.DOORBELL_DATA_FILE ??
      (process.env.VERCEL ? "/tmp/doorbell.json" : path.join(process.cwd(), ".data", "doorbell.json"));
    g.__doorbellDb = new FileDb(file);
  }
  return g.__doorbellDb;
}

export function storageIsDurable(): boolean {
  return !process.env.VERCEL || !!process.env.DOORBELL_DATA_FILE;
}
