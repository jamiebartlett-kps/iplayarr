import synonymService from '../../../service/synonymService';

export default defineEventHandler(async () => {
    const synonyms = await synonymService.getAllSynonyms();
    return synonyms;
});
