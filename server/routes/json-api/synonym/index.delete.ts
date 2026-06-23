import synonymService from '../../../service/synonymService';

export default defineEventHandler(async (event) => {
    const { id } = await readBody(event);
    await synonymService.removeSynonym(id);
    const synonyms = await synonymService.getAllSynonyms();
    return synonyms;
});
