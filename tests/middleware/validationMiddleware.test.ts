import { validate, commonValidations } from '../../src/middleware/validationMiddleware';

// Mock express-validator
jest.mock('express-validator', () => {
  const actualModule = jest.requireActual('express-validator');
  return {
    ...actualModule,
    validationResult: jest.fn(),
    body: jest.fn(() => ({
      optional: jest.fn().mockReturnThis(),
      isString: jest.fn().mockReturnThis(),
      trim: jest.fn().mockReturnThis(),
      escape: jest.fn().mockReturnThis(),
      isLength: jest.fn().mockReturnThis(),
      matches: jest.fn().mockReturnThis(),
      isEmail: jest.fn().mockReturnThis(),
      normalizeEmail: jest.fn().mockReturnThis(),
      isInt: jest.fn().mockReturnThis(),
      toInt: jest.fn().mockReturnThis(),
      isBoolean: jest.fn().mockReturnThis(),
      toBoolean: jest.fn().mockReturnThis(),
      isURL: jest.fn().mockReturnThis(),
      isAlphanumeric: jest.fn().mockReturnThis(),
    })),
  };
});

const { validationResult } = require('express-validator');

describe('validationMiddleware', () => {
  describe('validate', () => {
    it('should call next() when there are no errors', () => {
      validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
      const req = {} as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      validate(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', () => {
      const errors = [{ msg: 'field required' }];
      validationResult.mockReturnValue({ isEmpty: () => false, array: () => errors });
      const req = {} as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      validate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ errors });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('commonValidations', () => {
    it('should have apiKey validation', () => {
      expect(typeof commonValidations.apiKey).toBe('function');
    });

    it('should have username validation', () => {
      expect(typeof commonValidations.username).toBe('function');
    });

    it('should have email validation', () => {
      expect(typeof commonValidations.email).toBe('function');
    });

    it('should have configName validation', () => {
      expect(typeof commonValidations.configName).toBe('function');
    });

    it('should have url validation', () => {
      expect(typeof commonValidations.url).toBe('function');
    });

    it('should have number validation', () => {
      expect(typeof commonValidations.number).toBe('function');
    });

    it('should have boolean validation', () => {
      expect(typeof commonValidations.boolean).toBe('function');
    });

    it('should have objectId validation', () => {
      expect(typeof commonValidations.objectId).toBe('function');
    });
  });
});
