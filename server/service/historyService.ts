import { asc, eq } from 'drizzle-orm';

import { db } from '../db';
import { history as historyTable } from '../db/schema';
import { QueueEntry } from '../types/QueueEntry';
import { QueueEntryStatus } from '../types/responses/sabnzbd/QueueResponse';
import socketService from './socketService';

const historyService = {
    getHistory: async (): Promise<QueueEntry[]> => {
        return db
            .select()
            .from(historyTable)
            .orderBy(asc(historyTable.id))
            .all()
            .map((row) => row.data);
    },

    addHistory: async (item: QueueEntry): Promise<void> => {
        const historyItem: QueueEntry = {
            ...item,
            status: QueueEntryStatus.COMPLETE,
            details: { ...item.details, eta: '', speed: 0, progress: 100 },
            process: undefined,
        };
        db.insert(historyTable).values({ pid: historyItem.pid, data: historyItem }).run();
        socketService.emit('history', await historyService.getHistory());
    },

    addRelay: async (item: QueueEntry): Promise<void> => {
        db.insert(historyTable).values({ pid: item.pid, data: item }).run();
        socketService.emit('history', await historyService.getHistory());
    },

    addArchive: async (item: QueueEntry, status: QueueEntryStatus = QueueEntryStatus.CANCELLED): Promise<void> => {
        const historyItem: QueueEntry = {
            ...item,
            status,
            details: { ...item.details, eta: '', speed: 0, progress: 100 },
            process: undefined,
        };
        db.insert(historyTable).values({ pid: historyItem.pid, data: historyItem }).run();
        socketService.emit('history', await historyService.getHistory());
    },

    removeHistory: async (pid: string, archive: boolean = false): Promise<void> => {
        const existing = db.select().from(historyTable).where(eq(historyTable.pid, pid)).get();
        db.delete(historyTable).where(eq(historyTable.pid, pid)).run();
        socketService.emit('history', await historyService.getHistory());
        if (existing && archive) {
            historyService.addArchive(existing.data as QueueEntry, QueueEntryStatus.REMOVED);
        }
    },
};

export default historyService;
