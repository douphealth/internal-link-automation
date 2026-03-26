import { describe, it, expect } from 'vitest';
import { Ok, Err, isOk, isErr, unwrap, unwrapOr, map, mapErr, flatMap, fromPromise } from '@/shared/kernel/Result';

describe('Result', () => {
  describe('Ok / Err constructors', () => {
    it('creates Ok result', () => {
      const r = Ok(42);
      expect(r.ok).toBe(true);
      expect(r.value).toBe(42);
    });

    it('creates Err result', () => {
      const r = Err('fail');
      expect(r.ok).toBe(false);
      expect(r.error).toBe('fail');
    });
  });

  describe('isOk / isErr guards', () => {
    it('identifies Ok', () => {
      expect(isOk(Ok(1))).toBe(true);
      expect(isErr(Ok(1))).toBe(false);
    });

    it('identifies Err', () => {
      expect(isOk(Err('x'))).toBe(false);
      expect(isErr(Err('x'))).toBe(true);
    });
  });

  describe('unwrap', () => {
    it('returns value from Ok', () => {
      expect(unwrap(Ok('hello'))).toBe('hello');
    });

    it('throws on Err', () => {
      expect(() => unwrap(Err('boom'))).toThrow();
    });
  });

  describe('unwrapOr', () => {
    it('returns value from Ok', () => {
      expect(unwrapOr(Ok(10), 0)).toBe(10);
    });

    it('returns default from Err', () => {
      expect(unwrapOr(Err('x'), 0)).toBe(0);
    });
  });

  describe('map', () => {
    it('transforms Ok value', () => {
      const r = map(Ok(5), x => x * 2);
      expect(isOk(r) && r.value).toBe(10);
    });

    it('passes through Err', () => {
      const r = map(Err('e'), (x: number) => x * 2);
      expect(isErr(r) && r.error).toBe('e');
    });
  });

  describe('mapErr', () => {
    it('transforms Err', () => {
      const r = mapErr(Err('e'), e => e.toUpperCase());
      expect(isErr(r) && r.error).toBe('E');
    });

    it('passes through Ok', () => {
      const r = mapErr(Ok(1), (e: string) => e.toUpperCase());
      expect(isOk(r) && r.value).toBe(1);
    });
  });

  describe('flatMap', () => {
    it('chains Ok results', () => {
      const r = flatMap(Ok(5), x => Ok(x + 1));
      expect(isOk(r) && r.value).toBe(6);
    });

    it('short-circuits on Err', () => {
      const r = flatMap(Err('e'), (_x: number) => Ok(99));
      expect(isErr(r) && r.error).toBe('e');
    });
  });

  describe('fromPromise', () => {
    it('converts resolved promise to Ok', async () => {
      const r = await fromPromise(Promise.resolve(42));
      expect(isOk(r) && r.value).toBe(42);
    });

    it('converts rejected promise to Err', async () => {
      const r = await fromPromise(Promise.reject(new Error('fail')));
      expect(isErr(r) && r.error.message).toBe('fail');
    });
  });
});
