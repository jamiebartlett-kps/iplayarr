import { eq } from 'drizzle-orm';

import { db } from '../../db';
import { SqliteFIFOQueue } from '../../db/fifo';
import { grabHistory, meta, searchHistory } from '../../db/schema';
import { GrabHistoryEntry } from '../../types/data/GrabHistoryEntry';
import { SearchHistoryEntry } from '../../types/data/SearchHistoryEntry';
import { AbstractFIFOQueue } from '../../types/utils/AbstractFIFOQueue';
import RedisCacheService from '../redis/redisCacheService';

const UPTIME_KEY = 'uptime_start';

class StatisticsService {
    searchHistory: AbstractFIFOQueue<SearchHistoryEntry>;
    grabHistory: AbstractFIFOQueue<GrabHistoryEntry>;

    constructor() {
        this.searchHistory = new SqliteFIFOQueue(searchHistory, 500);
        this.grabHistory = new SqliteFIFOQueue(grabHistory, 500);
    }

    addSearch(entry: SearchHistoryEntry): void {
        this.searchHistory.enqueue(entry);
    }

    async getSearchHistory(): Promise<SearchHistoryEntry[]> {
        return await this.searchHistory.getItems();
    }

    async clearSearchHistory(): Promise<void> {
        await this.searchHistory.clear();
    }

    addGrab(entry: GrabHistoryEntry): void {
        this.grabHistory.enqueue(entry);
    }

    async getGrabHistory(): Promise<GrabHistoryEntry[]> {
        return await this.grabHistory.getItems();
    }

    async clearGrabHistory(): Promise<void> {
        await this.grabHistory.clear();
    }

    async setUptime(): Promise<void> {
        db.insert(meta)
            .values({ key: UPTIME_KEY, value: Date.now().toString() })
            .onConflictDoUpdate({ target: meta.key, set: { value: Date.now().toString() } })
            .run();
    }

    async getUptime(): Promise<number> {
        const row = db.select().from(meta).where(eq(meta.key, UPTIME_KEY)).get();
        if (row) {
            return Date.now() - parseInt(row.value);
        } else {
            return 0;
        }
    }

    async getCacheSizes(): Promise<{ [key: string]: string }> {
        const [search_size, schedule_size] = await Promise.all([
            RedisCacheService.getCacheSizeInMB(['search_cache_*']),
            RedisCacheService.getCacheSizeInMB(['schedule_cache_*']),
        ]);

        return {
            search: search_size,
            schedule: schedule_size,
        };
    }
}

export default new StatisticsService();
