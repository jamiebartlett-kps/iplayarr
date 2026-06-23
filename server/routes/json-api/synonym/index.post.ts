import synonymService from '../../../service/synonymService';
import { Synonym } from '../../../types/Synonym';

export default defineEventHandler(async (event) => {
    const synonym = (await readBody(event)) as Synonym;
    await synonymService.addSynonym(synonym);
    const synonyms = await synonymService.getAllSynonyms();
    return synonyms;
});
