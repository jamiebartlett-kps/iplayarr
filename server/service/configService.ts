import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

import { db } from '../db';
import { config as configTable } from '../db/schema';
import searchFacade from '../facade/searchFacade';
import { IplayarrParameter } from '../types/IplayarrParameters';

dotenv.config();

export interface ConfigMap {
    [key: string]: string;
}

const configService = {
    getAllConfig: async (): Promise<ConfigMap> => {
        const configMap: ConfigMap = {};
        for (const param of Object.values(IplayarrParameter)) {
            const parameter: string | undefined = await configService.getParameter(param);
            if (parameter) {
                configMap[param] = parameter;
            }
        }
        return configMap;
    },

    defaultConfigMap: {
        DEBUG: 'false',
        ACTIVE_LIMIT: '3',
        REFRESH_SCHEDULE: '0 * * * *',
        AUTH_USERNAME: 'admin',
        AUTH_PASSWORD: '$2b$10$4fiP4.TMyY3v08NQaQGPR.8HBbqXUlTNbQ11YWpTT9ptMCZFCRoeq',
        FALLBACK_FILENAME_SUFFIX: 'WEB.H264-BBC',
        MOVIE_FILENAME_TEMPLATE: '{{#if synonym}}{{synonym}}{{else}}{{title}}{{/if}}.WEBDL.{{quality}}-BBC',
        TV_FILENAME_TEMPLATE:
            '{{#if synonym}}{{synonym}}{{else}}{{title}}{{/if}}.S{{season}}E{{episode}}{{#if episodeTitle}}.{{episodeTitle}}{{/if}}.WEBDL.{{quality}}-BBC',
        VIDEO_QUALITY: 'hd',
        RSS_FEED_HOURS: '48',
        NATIVE_SEARCH: 'true',
        ARCHIVE_ENABLED: 'false',
        DOWNLOAD_CLIENT: 'GET_IPLAYER',
        OUTPUT_FORMAT: 'mp4',
        AUTH_TYPE: 'form',
    } as ConfigMap,

    getParameter: async (parameter: IplayarrParameter): Promise<string | undefined> => {
        const row = db.select().from(configTable).where(eq(configTable.key, parameter.toString())).get();
        return (
            row?.value ||
            process.env[parameter.toString()] ||
            configService.defaultConfigMap[parameter.toString()]
        );
    },

    getParameters: async (...parameters: IplayarrParameter[]): Promise<(string | undefined)[]> => {
        return await Promise.all(parameters.map(configService.getParameter));
    },

    setParameter: async (parameter: IplayarrParameter, value: string): Promise<void> => {
        const key = parameter.toString();
        const existing = db.select().from(configTable).where(eq(configTable.key, key)).get();
        const oldValue = existing?.value;
        db.insert(configTable)
            .values({ key, value })
            .onConflictDoUpdate({ target: configTable.key, set: { value } })
            .run();
        if (parameter == IplayarrParameter.NATIVE_SEARCH && oldValue != value) {
            searchFacade.clearSearchCache();
        }
    },

    removeParameter: async (parameter: IplayarrParameter): Promise<void> => {
        db.delete(configTable).where(eq(configTable.key, parameter.toString())).run();
    },
};

export default configService;
