/**
 * Security Utils Tests
 */

import { securityUtils } from '../../assets/js/utils/security.js';

describe('Security Utils', () => {
    describe('sanitizeHTML', () => {
        test('should escape HTML tags', () => {
            const input = '<script>alert("XSS")</script>';
            const expected = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
            expect(securityUtils.sanitizeHTML(input)).toBe(expected);
        });

        test('should handle null/undefined input', () => {
            expect(securityUtils.sanitizeHTML(null)).toBe('');
            expect(securityUtils.sanitizeHTML(undefined)).toBe('');
            expect(securityUtils.sanitizeHTML('')).toBe('');
        });
    });

    describe('validateEmail', () => {
        test('should validate email format', () => {
            expect(securityUtils.validateEmail('test@example.com')).toBe(true);
            expect(securityUtils.validateEmail('user.name@domain.co.uk')).toBe(true);
            expect(securityUtils.validateEmail('invalid-email')).toBe(false);
            expect(securityUtils.validateEmail('@domain.com')).toBe(false);
            expect(securityUtils.validateEmail('')).toBe(false);
            expect(securityUtils.validateEmail(null)).toBe(false);
        });
    });

    describe('CSRF Token', () => {
        test('should generate and validate CSRF token', () => {
            const token = securityUtils.generateCSRFToken();
            expect(token).toBeTruthy();
            expect(securityUtils.validateCSRFToken(token)).toBe(true);
            expect(securityUtils.validateCSRFToken('invalid-token')).toBe(false);
        });
    });

    describe('file validation', () => {
        const testFile = (name, size) => ({
            name,
            size: size || 1024,
            type: `image/${name.split('.').pop()}`
        });

        test('should validate file types', () => {
            const allowedTypes = ['.jpg', '.png', '.pdf'];
            
            expect(securityUtils.validateFileType(
                testFile('test.jpg'), 
                allowedTypes
            )).toBe(true);
            
            expect(securityUtils.validateFileType(
                testFile('test.txt'), 
                allowedTypes
            )).toBe(false);
            
            expect(securityUtils.validateFileType(
                null, 
                allowedTypes
            )).toBe(false);
        });

        test('should validate file size', () => {
            const maxSizeMB = 5; // 5MB
            
            expect(securityUtils.validateFileSize(
                testFile('test.jpg', 4 * 1024 * 1024), // 4MB
                maxSizeMB
            )).toBe(true);
            
            expect(securityUtils.validateFileSize(
                testFile('large.jpg', 6 * 1024 * 1024), // 6MB
                maxSizeMB
            )).toBe(false);
            
            expect(securityUtils.validateFileSize(
                null, 
                maxSizeMB
            )).toBe(false);
        });
    });

    describe('sanitizeObject', () => {
        test('should sanitize object properties recursively', () => {
            const input = {
                name: '<b>Test</b>',
                description: '<script>alert(1)</script>',
                nested: {
                    html: '<div>Test</div>',
                    text: 'Safe text'
                },
                array: [
                    { value: '<p>test</p>' },
                    'plain text'
                ]
            };

            const result = securityUtils.sanitizeObject(input);

            expect(result.name).toBe('&lt;b&gt;Test&lt;/b&gt;');
            expect(result.description).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
            expect(result.nested.html).toBe('&lt;div&gt;Test&lt;/div&gt;');
            expect(result.nested.text).toBe('Safe text');
            expect(result.array[0].value).toBe('&lt;p&gt;test&lt;/p&gt;');
            expect(result.array[1]).toBe('plain text');
        });

        test('should handle null/undefined input', () => {
            expect(securityUtils.sanitizeObject(null)).toEqual({});
            expect(securityUtils.sanitizeObject(undefined)).toEqual({});
        });
    });
});
