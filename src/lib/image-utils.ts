/**
 * Converts various Google Drive link formats to a direct image link
 * that can be used in an <img> tag.
 */
export function convertDriveUrl(url: string | null | undefined): string {
    if (!url) return "";

    // Handle Google Drive links
    const driveMatch = url.match(/\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
        // Return direct thumbnail/view link for Google Drive
        return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }

    return url;
}
