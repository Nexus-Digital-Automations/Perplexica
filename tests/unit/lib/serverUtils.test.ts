import { describe, it, expect } from 'vitest';
import { hashObj } from '@/lib/serverUtils';
import crypto from 'crypto';

describe('serverUtils', () => {
  describe('hashObj', () => {
    it('should hash a simple object', () => {
      const obj = { name: 'John', age: 30 };
      const hash = hashObj(obj);
      
      // Expected hash: SHA256 of sorted JSON string
      const expectedJson = JSON.stringify(obj, Object.keys(obj).sort());
      const expectedHash = crypto.createHash('sha256').update(expectedJson).digest('hex');
      
      expect(hash).toBe(expectedHash);
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex string
    });

    it('should produce same hash for objects with same properties in different order', () => {
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { age: 30, name: 'John' };
      
      expect(hashObj(obj1)).toBe(hashObj(obj2));
    });

    it('should produce different hashes for different objects', () => {
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { name: 'Jane', age: 30 };
      
      expect(hashObj(obj1)).not.toBe(hashObj(obj2));
    });

    it('should handle nested objects', () => {
      const obj = { 
        name: 'John', 
        address: { 
          city: 'New York', 
          zip: '10001' 
        } 
      };
      const hash = hashObj(obj);
      
      const expectedJson = JSON.stringify(obj, Object.keys(obj).sort());
      const expectedHash = crypto.createHash('sha256').update(expectedJson).digest('hex');
      
      expect(hash).toBe(expectedHash);
    });

    it('should handle arrays', () => {
      const obj = { 
        name: 'John', 
        tags: ['admin', 'user'] 
      };
      const hash = hashObj(obj);
      
      const expectedJson = JSON.stringify(obj, Object.keys(obj).sort());
      const expectedHash = crypto.createHash('sha256').update(expectedJson).digest('hex');
      
      expect(hash).toBe(expectedHash);
    });

    it('should handle empty object', () => {
      const obj = {};
      const hash = hashObj(obj);
      
      // For empty object, Object.keys(obj).sort() returns []
      // JSON.stringify({}, []) produces "{}"
      const expectedJson = '{}';
      const expectedHash = crypto.createHash('sha256').update(expectedJson).digest('hex');
      
      expect(hash).toBe(expectedHash);
      expect(hash).toBe('44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a');
    });

    it('should handle null and undefined values', () => {
      const obj = { 
        name: 'John', 
        middleName: null,
        nickname: undefined 
      };
      const hash = hashObj(obj);
      
      // undefined values are omitted by JSON.stringify
      const expectedJson = JSON.stringify({ name: 'John', middleName: null }, ['middleName', 'name']);
      const expectedHash = crypto.createHash('sha256').update(expectedJson).digest('hex');
      
      expect(hash).toBe(expectedHash);
    });

    it('should throw on circular references', () => {
      const obj: any = { name: 'John' };
      obj.self = obj; // Create circular reference
      
      // JSON.stringify will throw on circular references
      expect(() => hashObj(obj)).toThrow();
    });
  });
});