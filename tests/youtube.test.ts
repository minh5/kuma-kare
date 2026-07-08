import { describe, it, expect } from 'vitest';
import { extractYouTubeIds, detectYouTubeUrls } from '../src/lib/youtube';

describe('youtube URL detection', () => {
  describe('extractYouTubeIds', () => {
    it('extracts ID from youtube.com/watch?v= URL', () => {
      const ids = extractYouTubeIds('Check this: https://youtube.com/watch?v=dQw4w9WgXcQ');
      expect(ids).toEqual(['dQw4w9WgXcQ']);
    });

    it('extracts ID from youtu.be/ short URL', () => {
      const ids = extractYouTubeIds('Video: https://youtu.be/dQw4w9WgXcQ');
      expect(ids).toEqual(['dQw4w9WgXcQ']);
    });

    it('extracts ID from www.youtube.com URL', () => {
      const ids = extractYouTubeIds('https://www.youtube.com/watch?v=abc123DEF45');
      expect(ids).toEqual(['abc123DEF45']);
    });

    it('extracts ID with additional query params', () => {
      const ids = extractYouTubeIds('https://youtube.com/watch?v=dQw4w9WgXcQ&t=120');
      expect(ids).toEqual(['dQw4w9WgXcQ']);
    });

    it('extracts multiple IDs from text', () => {
      const text = 'First: https://youtu.be/abc123DEF45 and second: https://youtube.com/watch?v=xyz789GHI01';
      const ids = extractYouTubeIds(text);
      expect(ids).toEqual(['abc123DEF45', 'xyz789GHI01']);
    });

    it('returns empty array for text without YouTube URLs', () => {
      const ids = extractYouTubeIds('No videos here, just text.');
      expect(ids).toEqual([]);
    });

    it('handles IDs with hyphens and underscores', () => {
      const ids = extractYouTubeIds('https://youtu.be/a-b_c1D2E3F');
      expect(ids).toEqual(['a-b_c1D2E3F']);
    });
  });

  describe('detectYouTubeUrls', () => {
    it('returns URL and ID pairs', () => {
      const results = detectYouTubeUrls('Watch https://youtube.com/watch?v=dQw4w9WgXcQ here');
      expect(results).toEqual([{ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', id: 'dQw4w9WgXcQ' }]);
    });

    it('returns empty array for no matches', () => {
      const results = detectYouTubeUrls('Plain text');
      expect(results).toEqual([]);
    });
  });
});