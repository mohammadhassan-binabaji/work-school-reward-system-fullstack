import { describe, expect, it } from 'vitest';
import { resolveFileUrl } from '@student-reward/shared';

describe('resolveFileUrl', () => {
  it('returns fallback or empty string for empty inputs', () => {
    expect(resolveFileUrl(null)).toBe('');
    expect(resolveFileUrl(undefined)).toBe('');
    expect(resolveFileUrl('')).toBe('');
    expect(resolveFileUrl('   ', { fallback: '/placeholder.png' })).toBe('/placeholder.png');
  });

  it('keeps already absolute and scheme URLs intact', () => {
    expect(resolveFileUrl('https://example.com/photo.png')).toBe('https://example.com/photo.png');
    expect(resolveFileUrl('http://example.com/avatar.jpg')).toBe('http://example.com/avatar.jpg');
    expect(resolveFileUrl('data:image/png;base64,xxxx')).toBe('data:image/png;base64,xxxx');
    expect(resolveFileUrl('blob:http://localhost/uuid')).toBe('blob:http://localhost/uuid');
    expect(resolveFileUrl('capacitor://localhost/some.png')).toBe('capacitor://localhost/some.png');
    expect(resolveFileUrl('file:///storage/emulated/0/photo.jpg')).toBe('file:///storage/emulated/0/photo.jpg');
    expect(resolveFileUrl('//cdn.example.com/pic.png')).toBe('//cdn.example.com/pic.png');
  });

  it('keeps bundled local APK assets intact without network prefix', () => {
    expect(resolveFileUrl('/assets/index-Dpguv5ey.js')).toBe('/assets/index-Dpguv5ey.js');
    expect(resolveFileUrl('assets/owl-cheering.png')).toBe('assets/owl-cheering.png');
  });

  it('resolves remote upload paths with base URL', () => {
    expect(resolveFileUrl('/uploads/user-avatar.png', { baseUrl: 'https://student.mhbj.ir' }))
      .toBe('https://student.mhbj.ir/uploads/user-avatar.png');

    expect(resolveFileUrl('uploads/reward.jpg', { baseUrl: 'https://student.mhbj.ir/' }))
      .toBe('https://student.mhbj.ir/uploads/reward.jpg');
  });

  it('supports remote flag for custom backend paths', () => {
    expect(resolveFileUrl('/custom-files/doc.pdf', { remote: true, baseUrl: 'https://files.mhbj.ir' }))
      .toBe('https://files.mhbj.ir/custom-files/doc.pdf');
  });
});
