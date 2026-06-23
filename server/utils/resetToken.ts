import { v4 } from 'uuid';

// Module-level state replicating AuthRoute.ts's in-memory forgot-password token
// and its 5-minute reset timer. Single-process deployment assumed (confirmed).
let token: string = '';
let resetTimer: NodeJS.Timeout | undefined;

export function generateResetToken(): void {
    token = v4();
    console.log(`FORGOT PASSWORD TOKEN: ${token} This expires in 5 minutes`);
    if (resetTimer) {
        clearTimeout(resetTimer);
    }
    resetTimer = setTimeout(() => (token = ''), 300000);
}

export function getResetToken(): string {
    return token;
}

export function clearResetToken(): void {
    token = '';
    if (resetTimer) {
        clearTimeout(resetTimer);
    }
}
