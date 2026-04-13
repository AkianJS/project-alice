import { describe, it, expect } from 'vitest';
import { validateBranch } from './NewSessionDialog';

describe('validateBranch — valid inputs (return null)', () => {
  it.each([
    ['main'],
    ['feature/my-branch'],
    ['fix_123'],
    ['release-1.0'],
    ['UPPER'],
    ['a'],
    ['feat/scope/detail'],
    ['0.9.1'],
  ])('"%s" is valid', (input) => {
    expect(validateBranch(input)).toBeNull();
  });
});

describe('validateBranch — invalid inputs (return error string)', () => {
  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['branch name', 'invalid characters'],
    ['feat@scope', 'invalid characters'],
    ['br#nch', 'invalid characters'],
    ['hello!', 'invalid characters'],
    ['name:colon', 'invalid characters'],
  ])('"%s" returns message containing "%s"', (input, expectedFragment) => {
    const result = validateBranch(input);
    expect(result).not.toBeNull();
    expect(result).toContain(expectedFragment);
  });
});
