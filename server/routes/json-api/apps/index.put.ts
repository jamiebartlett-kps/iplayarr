import { App } from '../../../types/App';
import { handleUpdateApp } from '../../../utils/appUpdate';

export default defineEventHandler(async (event) => {
    const form = (await readBody(event)) as App;
    const { status, body } = await handleUpdateApp('PUT', form);
    if (status) setResponseStatus(event, status);
    return body;
});
