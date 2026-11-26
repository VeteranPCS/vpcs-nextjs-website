const WEB_FORM_URL_MAX_LENGTH = 255;

export function appendLeadSubmissionMarker(webFormUrl: string, submissionId: string): string {
    const markerName = 'sid';
    const encodedSubmissionId = encodeURIComponent(submissionId);

    try {
        const url = new URL(webFormUrl);
        url.searchParams.set(markerName, submissionId);

        const markedUrl = url.toString();
        if (markedUrl.length <= WEB_FORM_URL_MAX_LENGTH) return markedUrl;

        const compactUrl = `${url.origin}${url.pathname}?${markerName}=${encodedSubmissionId}`;
        if (compactUrl.length <= WEB_FORM_URL_MAX_LENGTH) return compactUrl;

        return markedUrl.slice(0, WEB_FORM_URL_MAX_LENGTH);
    } catch {
        const separator = webFormUrl.includes('?') ? '&' : '?';
        const markedUrl = `${webFormUrl}${separator}${markerName}=${encodedSubmissionId}`;
        return markedUrl.length <= WEB_FORM_URL_MAX_LENGTH
            ? markedUrl
            : markedUrl.slice(0, WEB_FORM_URL_MAX_LENGTH);
    }
}
