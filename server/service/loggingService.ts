import 'winston-daily-rotate-file';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { IplayarrParameter } from '../types/IplayarrParameters';
import { LogLine, LogLineLevel } from '../types/LogLine';
import configService from './configService';
import socketService from './socketService';

const isTest = process.env.NODE_ENV === 'test';

// Use the imported DailyRotateFile constructor directly; under ESM bundling the
// `winston-daily-rotate-file` side-effect that augments winston.transports does
// not attach. Same transport class and options — behaviour is unchanged.
const transport = isTest ? {} : new DailyRotateFile({
    dirname: process.env.LOG_DIR || './logs',
    filename: 'iplayarr-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
});

const fileLogger = isTest
    ? { info: () => { }, error: () => { }, debug: () => { } } :
    winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
    ),
        transports: [transport as DailyRotateFile],
});

// In-memory ring buffer of the most recent log lines (was a Redis list). The app
// is single-process, so an in-memory buffer is equivalent and needs no Redis.
const MAX_RECENT_LOGS = 250;
const recentLogs: LogLine[] = [];

const loggingService = {
    log: (...params: any[]) => {
        console.log(...params);
        const message = joinOrReturn(params);
        fileLogger.info(message);
        const logLine: LogLine = { level: LogLineLevel.INFO, id: 'INFO', message, timestamp: new Date() };
        loggingService.publish(logLine);
    },

    error: (...params: any[]) => {
        console.error(params);
        const message = joinOrReturn(params);
        fileLogger.error(message);
        const logLine: LogLine = { level: LogLineLevel.ERROR, id: 'ERROR', message, timestamp: new Date() };
        loggingService.publish(logLine);
    },

    debug: (...params: any[]) => {
        configService.getParameter(IplayarrParameter.DEBUG).then((debug) => {
            const message = joinOrReturn(params);
            if (debug && debug.toLowerCase() == 'true') {
                console.log(...params);
                fileLogger.debug(message);
                const logLine: LogLine = { level: LogLineLevel.DEBUG, id: 'DEBUG', message, timestamp: new Date() };
                loggingService.publish(logLine);
            }
        });
    },

    publish: (logLine: LogLine) => {
        socketService.emit('log', logLine);

        recentLogs.push(logLine);
        if (recentLogs.length > MAX_RECENT_LOGS) {
            recentLogs.splice(0, recentLogs.length - MAX_RECENT_LOGS);
        }
    },

    pushInitialLogs: async (socketId: string) => {
        recentLogs.forEach((logLine) => {
            socketService.publish(socketId, 'log', logLine);
        });
    }
};



function joinOrReturn(input: string | any[]): string {
    if (Array.isArray(input)) {
        return input
            .map((item: any) => {
                if (typeof item === 'string') {
                    return item;
                } else {
                    return JSON.stringify(item, null, 2);
                }
            })
            .join(' ');
    } else if (typeof input === 'string') {
        return input;
    }
    return '';
}

export default loggingService;
