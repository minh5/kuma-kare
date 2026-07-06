import { describe, it, expect } from 'vitest';
import { extractYouTubeVideoIds, detectYouTubeUrls } from '../src/lib/youtube';

describe('YouTube URL detection', () => {
  describe('extractYouTubeVideoIds', () => {
    it('extracts video ID from youtube.com/watch?v= URL', () => {
      const text = 'Check this video: https://youtube.com/watch?v=dQw4w9WgXcQ';
      const ids = extractYouTubeVideoIds(text);
      expect(ids).toEqual(['dQw4w9WgXcQ']);
    });

    it('extracts video ID from youtu.be/ short URL', () => {
      const text = 'Watch here: https://youtu.be/dQw4w9WgXcQ';
      const ids = extractYouTubeVideoIds(text);
      expect(ids).toEqual(['dQw4w9WgXcQ']);
    });

    it('extracts video ID from URL with additional query params', () => {
      const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s';
      const ids = extractYouTubeVideoIds(text);
      expect(ids).toEqual(['dQw4w9WgXcQ']);
    });

    it('extracts multiple video IDs from text', () => {
      const text = 'First: https://youtu.be/abc123def45 and second: https://youtube.com/watch?v=xyz789ghi01';
      const ids = extractYouTubeVideoIds(text);
      expect(ids).toEqual(['abc123def45', 'xyz789ghi01']);
    });

    it('returns empty array when no YouTube URLs present', () => {
      const text = 'No videos here, just text.';
      const ids = extractYouTubeVideoIds(text);
      expect(ids).toEqual([]);
    });

    it('handles www prefix', () => {
      const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const ids = extractYouTubeVideoIds(text);
      expect(ids).toEqual(['dQw4w9WgXcQ']);
    });

    it('handles http without s', () => {
      const text = 'http://youtube.com/watch?v=dQw4w9WgXcQ';
      const ids = extractYouTubeVideoIds(text);
      expect(ids).toEqual(['dQw4w9WgXcQ']);
    });
  });

  describe('detectYouTubeUrls', () => {
    it('returns URL and video ID pairs', () => {
      const text = 'Check https://youtu.be/dQw4w9WgXcQ for instructions';
      const results = detectYouTubeUrls(text);
      expect(results).toEqual([{ url: 'https://youtu.be/dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ' }]);
    });

    it('returns empty array for text without YouTube URLs', () => {
      const text = 'Just some plain text';
      const results = detectYouTubeUrls(text);
      expect(results).toEqual([]);
    });
  });
});