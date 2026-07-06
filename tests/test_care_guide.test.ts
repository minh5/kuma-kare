import { describe, it, expect } from 'vitest';
import { getCareGuide, getEmergencyContacts, buildSystemPrompt } from '../worker/lib/careGuide';

describe('Care Guide utilities', () => {
  describe('getCareGuide', () => {
    it('returns care guide content as string', () => {
      const content = getCareGuide();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('does not contain phone numbers or addresses', () => {
      const content = getCareGuide();
      expect(content).not.toMatch(/\d{3}[-.]?\d{3}[-.]?\d{4}/);
      expect(content.toLowerCase()).not.toContain('address');
    });

    it('contains feeding instructions', () => {
      const content = getCareGuide();
      expect(content.toLowerCase()).toContain('feed');
    });
  });

  describe('getEmergencyContacts', () => {
    it('returns emergency contacts content as string', () => {
      const content = getEmergencyContacts();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('contains contact information', () => {
      const content = getEmergencyContacts();
      expect(content.toLowerCase()).toContain('vet');
    });
  });

  describe('buildSystemPrompt', () => {
    it('includes care guide content', () => {
      const prompt = buildSystemPrompt();
      const careGuide = getCareGuide();
      expect(prompt).toContain(careGuide);
    });

    it('instructs LLM to answer only from care guide', () => {
      const prompt = buildSystemPrompt();
      expect(prompt.toLowerCase()).toContain('care guide');
    });

    it('instructs LLM to direct users to Emergency Contacts page for phone numbers', () => {
      const prompt = buildSystemPrompt();
      expect(prompt.toLowerCase()).toContain('emergency contacts');
    });

    it('instructs LLM to never reveal personal info', () => {
      const prompt = buildSystemPrompt();
      expect(prompt.toLowerCase()).toMatch(/never|do not/);
      expect(prompt.toLowerCase()).toContain('personal');
    });
  });
});