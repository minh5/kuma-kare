const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/g;

export interface YouTubeMatch {
  url: string;
  videoId: string;
}

export function extractYouTubeVideoIds(text: string): string[] {
  if (!text) return [];
  const ids: string[] = [];
  const local = new RegExp(YOUTUBE_REGEX.source, YOUTUBE_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = local.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

export function detectYouTubeUrls(text: string): YouTubeMatch[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const results: YouTubeMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1];
    const idMatch = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/.exec(url);
    if (idMatch) {
      results.push({ url, videoId: idMatch[1] });
    }
  }
  return results;
}
