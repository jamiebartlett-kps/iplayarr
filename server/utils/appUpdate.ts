import appService from '../service/appService';
import { App } from '../types/App';
import { ApiError, ApiResponse } from '../types/responses/ApiResponse';
import { AppFormValidator } from '../validators/AppFormValidator';

// Shared POST/PUT app create-or-update logic from AppsRoute.updateApp, returning
// the status + body so the .post.ts / .put.ts handlers can apply them. Behaviour
// (validation, integration creation, rollback on POST failure) is unchanged.
export async function handleUpdateApp(method: string, form: App): Promise<{ status?: number; body: any }> {
    const appServiceMethod = method === 'POST' ? 'addApp' : 'updateApp';
    const appFormValidator: AppFormValidator = new AppFormValidator();
    const validationResult = await appFormValidator.validate(form);
    if (Object.keys(validationResult).length == 0) {
        const updatedForm: App | undefined = await (appService as any)[appServiceMethod](form);
        if (updatedForm) {
            try {
                await appService.createUpdateIntegrations(updatedForm);
            } catch (err: any) {
                if (err.type == 'download_client') {
                    validationResult['download_client_name'] = err?.message;
                } else {
                    validationResult['indexer_name'] = err?.message;
                    validationResult['indexer_priority'] = err?.message;
                }

                // Delete the half complete app if it's new
                if (method === 'POST') {
                    await appService.removeApp(updatedForm.id);
                }

                return {
                    status: 400,
                    body: { error: ApiError.INVALID_INPUT, invalid_fields: validationResult } as ApiResponse,
                };
            }
            return { body: updatedForm };
        } else {
            validationResult['name'] = 'Error Saving App';
            return {
                status: 400,
                body: { error: ApiError.INVALID_INPUT, invalid_fields: validationResult } as ApiResponse,
            };
        }
    } else {
        return {
            status: 400,
            body: { error: ApiError.INVALID_INPUT, invalid_fields: validationResult } as ApiResponse,
        };
    }
}
