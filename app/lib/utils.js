export const getHost = () => {
    // Frontend and API are now served same-origin by the unified Nuxt app, so
    // requests are always relative. (Originally the dev SPA hit a separate
    // backend on :4404; that split no longer exists.)
    return '';
};

export const getPidFromBBCUrl = (url) => {
    if (!url) {
        return undefined;
    }
    const match = url.match(/https:\/\/www\.bbc\.co\.uk\/iplayer\/[^?]+\/(m[0-9a-z]{7})\/[^?]+/);
    return match ? match[1] : undefined;
}

export const formatStorageSize = (mb) => {
    if (mb) {
        if (mb >= 1024) {
            return (mb / 1024).toFixed(2) + ' GB';
        }
        return mb.toFixed(2) + ' MB';
    }
    return;
};

export const enforceMaxLength = (arr, maxLength) => {
    if (arr.length > maxLength) {
        arr.splice(0, arr.length - maxLength);
    }
};

export function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function deepCopy(input) {
    return input ? JSON.parse(JSON.stringify(input)) : undefined;
}

export function getCleanSceneTitle(title) {
    if (!title || title.trim().length === 0) {
        return '';
    }

    const beginningThe = /^The\s/i;
    const specialCharacter = /[`'.]/g;
    const nonWord = /\W/g;

    let cleanTitle = title.replace(beginningThe, '');
    cleanTitle = cleanTitle.replaceAll('&', 'and');
    cleanTitle = cleanTitle.replace(specialCharacter, '');
    cleanTitle = cleanTitle.replace(nonWord, '+');

    // Remove any repeating +s
    cleanTitle = cleanTitle.replace(/\+{2,}/g, '+');

    cleanTitle = cleanTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    cleanTitle = cleanTitle.replace(/^\++|\++$/, '');
    return cleanTitle.trim().replaceAll('+', ' ');
}

export function formatDate(dateString, dateStyle, timeStyle) {
    const date = dateString != null ? new Date(dateString) : undefined;
    return isNaN(date?.getTime())
        ? undefined
        : new Intl.DateTimeFormat('en-GB', {
              dateStyle: dateStyle ?? 'medium',
              timeStyle: timeStyle ?? 'short',
              hour12: true,
          }).format(date);
}
