import { asc, count, desc, eq, lt } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { AbstractFIFOQueue } from '../types/utils/AbstractFIFOQueue';
import { db } from './index';

// SQLite-backed capped FIFO, replacing RedisFIFOQueue. The backing table has an
// autoincrement `id` and a json `data` column. getItems() returns newest-first
// (matching the old Redis lpush/lrange semantics); the queue is capped to
// maxSize by trimming the oldest rows on enqueue.
export class SqliteFIFOQueue<T> implements AbstractFIFOQueue<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private table: any, private maxSize: number) {}

    async enqueue(item: T): Promise<void> {
        db.insert(this.table).values({ data: item }).run();
        const keep = db.select({ id: this.table.id }).from(this.table as SQLiteTable).orderBy(desc(this.table.id)).limit(this.maxSize).all();
        if (keep.length >= this.maxSize) {
            const minKeepId = keep[keep.length - 1].id;
            db.delete(this.table).where(lt(this.table.id, minKeepId)).run();
        }
    }

    async dequeue(): Promise<T | undefined> {
        const row: any = db.select().from(this.table as SQLiteTable).orderBy(asc(this.table.id)).limit(1).get();
        if (!row) return undefined;
        db.delete(this.table).where(eq(this.table.id, row.id)).run();
        return row.data as T;
    }

    async peek(): Promise<T | undefined> {
        const row: any = db.select().from(this.table as SQLiteTable).orderBy(asc(this.table.id)).limit(1).get();
        return row ? (row.data as T) : undefined;
    }

    async size(): Promise<number> {
        const row = db.select({ c: count() }).from(this.table as SQLiteTable).get();
        return row?.c ?? 0;
    }

    async isEmpty(): Promise<boolean> {
        return (await this.size()) === 0;
    }

    async getItems(): Promise<T[]> {
        return db
            .select()
            .from(this.table as SQLiteTable)
            .orderBy(desc(this.table.id))
            .all()
            .map((row: any) => row.data as T);
    }

    async clear(): Promise<void> {
        db.delete(this.table).run();
    }
}
