export interface YouTubeUrlMatch {
  id: string;
  url: string;
}

const YOUTUBE_REGEX =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:[^#\s]*&)?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/g;

export function extractYouTubeIds(text: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  YOUTUBE_REGEX.lastIndex = 0;
  while ((match = YOUTUBE_REGEX.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

export function detectYouTubeUrls(text: string): YouTubeUrlMatch[] {
  const urls: YouTubeUrlMatch[] = [];
  let match: RegExpExecArray | null;
  YOUTUBE_REGEX.lastIndex = 0;
  while ((match = YOUTUBE_REGEX.exec(text)) !== null) {
    urls.push({ id: match[1], url: match[0] });
  }
  return urls;
}
