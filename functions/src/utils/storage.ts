/**
 * Firebase Storage 다운로드 URL에서 Storage 버킷 내의 파일 경로를 추출합니다.
 * 두 가지 주요 URL 형태를 모두 처리합니다.
 * @param imageUrl Storage 파일의 다운로드 URL
 * @returns Storage 내의 파일 경로 (예: 'receipts/userId/fileName.jpg')
 */
export function getFilePathFromStorageUrl(imageUrl: string): string | null {
    if (!imageUrl) {
        return null;
    }

    try {
        const url = new URL(imageUrl);
        let path: string;

        if (url.hostname.includes('firebasestorage.googleapis.com')) {
            // 형태 1: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
            // /v0/b/{bucket}/o/ 이후가 경로
            const parts = url.pathname.split('/o/');
            if (parts.length < 2) return null; // /o/가 없는 경우
            path = decodeURIComponent(parts[1]);
        } else if (url.hostname.includes('storage.googleapis.com')) {
            // 형태 2: https://storage.googleapis.com/{bucket}/{path}
            // /{bucket}/ 이후가 경로
            const parts = url.pathname.split('/');
            // parts[0]은 빈 문자열, parts[1]은 버킷 이름이므로, parts.slice(2)부터 실제 경로입니다.
            if (parts.length < 3) return null; // 버킷 이름과 경로가 없는 경우
            path = decodeURIComponent(parts.slice(2).join('/'));
        } else {
            console.warn(`Unrecognized Storage URL format: ${imageUrl}`);
            return null;
        }
        return path;
    } catch (error) {
        console.error(`Error parsing Storage URL ${imageUrl}:`, error);
        return null;
    }
}

/**
 * Firebase Storage 다운로드 URL에서 버킷 이름을 추출합니다.
 * @param imageUrl Storage 파일의 다운로드 URL
 * @returns 버킷 이름 (예: 'neilson-receipts.firebasestorage.app')
 */
export function getBucketNameFromStorageUrl(imageUrl: string): string | null {
    if (!imageUrl) {
        return null;
    }
    try {
        const url = new URL(imageUrl);
        if (url.hostname.includes('firebasestorage.googleapis.com')) {
            // /v0/b/{bucket}/o/
            const match = url.pathname.match(/\/b\/([^\/]+)\/o\//);
            return match ? match[1] : null;
        } else if (url.hostname.includes('storage.googleapis.com')) {
            // {bucket}.storage.googleapis.com 또는 storage.googleapis.com/{bucket}
            // 현재 사용자의 URL은 storage.googleapis.com/neilson-receipts.firebasestorage.app/ 형식
            const parts = url.pathname.split('/');
            return parts.length > 1 ? parts[1] : null;
        }
        return null;
    } catch (error) {
        console.error(`Error parsing bucket name from URL ${imageUrl}:`, error);
        return null;
    }
}
