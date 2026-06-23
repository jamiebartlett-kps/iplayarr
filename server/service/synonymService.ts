import { eq } from 'drizzle-orm';
import { v4 } from 'uuid';

import { db } from '../db';
import { synonyms as synonymsTable } from '../db/schema';
import searchFacade from '../facade/searchFacade';
import { Synonym } from '../types/Synonym';

const synonymService = {
    getSynonym: async (inputTerm: string): Promise<Synonym | undefined> => {
        const allSynonyms = await synonymService.getAllSynonyms();
        return allSynonyms.find(
            ({ from: savedFrom, target: savedTarget }) =>
                savedFrom.toLocaleLowerCase() == inputTerm.toLocaleLowerCase() ||
                savedTarget.toLocaleLowerCase() == inputTerm.toLocaleLowerCase()
        );
    },

    getAllSynonyms: async (): Promise<Synonym[]> => {
        return db
            .select()
            .from(synonymsTable)
            .all()
            .map((row) => row.data);
    },

    addSynonym: async (synonym: Synonym): Promise<void> => {
        if (!synonym.id) {
            const id = v4();
            synonym.id = id;
        }
        db.insert(synonymsTable)
            .values({ id: synonym.id, data: synonym })
            .onConflictDoUpdate({ target: synonymsTable.id, set: { data: synonym } })
            .run();
        searchFacade.removeFromSearchCache(synonym.target);
    },

    updateSynonym: async (synonym: Synonym): Promise<void> => {
        await synonymService.removeSynonym(synonym.id);
        await synonymService.addSynonym(synonym);
    },

    removeSynonym: async (id: string): Promise<void> => {
        const foundSynonym = db.select().from(synonymsTable).where(eq(synonymsTable.id, id)).get();
        if (foundSynonym) {
            db.delete(synonymsTable).where(eq(synonymsTable.id, id)).run();
            searchFacade.removeFromSearchCache(foundSynonym.data.target);
        }
    },
};

export default synonymService;
