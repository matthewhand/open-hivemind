import { validate, commonValidations } from '../../src/middleware/validationMiddleware';
import { body } from 'express-validator';

// Mock express-validator
jest.mock('express-validator', () => {
  const actualModule = jest.requireActual('express-validator');

  const mockChain = {
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
  };

  return {
    ...actualModule,
    validationResult: jest.fn(),
    body: jest.fn(() => mockChain),
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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should have apiKey validation', () => {
      commonValidations.apiKey();
      expect(body).toHaveBeenCalledWith('apiKey');
    });

    it('should have username validation', () => {
      commonValidations.username();
      expect(body).toHaveBeenCalledWith('username');
    });

    it('should have email validation', () => {
      commonValidations.email();
      expect(body).toHaveBeenCalledWith('email');
    });

    it('should have configName validation', () => {
      commonValidations.configName();
      expect(body).toHaveBeenCalledWith('name');
    });

    it('should have configValue validation', () => {
      commonValidations.configValue();
      expect(body).toHaveBeenCalledWith('value');
    });

    it('should have comment validation', () => {
      commonValidations.comment();
      expect(body).toHaveBeenCalledWith('comment');
    });

    it('should have message validation', () => {
      commonValidations.message();
      expect(body).toHaveBeenCalledWith('message');
    });

    it('should have url validation', () => {
      commonValidations.url();
      expect(body).toHaveBeenCalledWith('url');
    });

    it('should have number validation with defaults', () => {
      commonValidations.number();
      expect(body).toHaveBeenCalledWith('number');
    });

    it('should have number validation with custom min/max', () => {
      commonValidations.number(1, 10);
      expect(body).toHaveBeenCalledWith('number');
    });

    it('should have boolean validation', () => {
      commonValidations.boolean();
      expect(body).toHaveBeenCalledWith('boolean');
    });

    it('should have objectId validation', () => {
      commonValidations.objectId();
      expect(body).toHaveBeenCalledWith('id');
    });
  });
});
