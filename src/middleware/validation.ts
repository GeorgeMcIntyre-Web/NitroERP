import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

// Generic validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      throw new ValidationError(errorMessage);
    }

    req.body = value;
    next();
  };
};

// Login validation schema
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(1).required().messages({
    'any.required': 'Password is required',
  }),
});

export const validateLogin = validate(loginSchema);

// Registration validation schema
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required',
  }),
  role: Joi.string().valid('super_admin', 'admin', 'manager', 'employee', 'viewer').required().messages({
    'any.only': 'Invalid role selected',
    'any.required': 'Role is required',
  }),
  department: Joi.string().valid('finance', 'hr', 'engineering', 'manufacturing', 'control', 'sales', 'it', 'quality').required().messages({
    'any.only': 'Invalid department selected',
    'any.required': 'Department is required',
  }),
  position: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Position must be at least 2 characters long',
    'string.max': 'Position cannot exceed 100 characters',
    'any.required': 'Position is required',
  }),
  employeeId: Joi.string().optional(),
});

export const validateRegister = validate(registerSchema);

// Password reset validation schema
export const passwordResetSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
});

export const validatePasswordReset = validate(passwordResetSchema);

// Change password validation schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'New password must be at least 8 characters long',
    'any.required': 'New password is required',
  }),
});

export const validateChangePassword = validate(changePasswordSchema);

// Profile update validation schema
export const profileUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
  }),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number',
  }),
  preferences: Joi.object().optional(),
});

export const validateProfileUpdate = validate(profileUpdateSchema);

// Pagination validation schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'Sort order must be either "asc" or "desc"',
  }),
});

export const validatePagination = validate(paginationSchema);

// Search validation schema
export const searchSchema = Joi.object({
  query: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Search query must be at least 1 character long',
    'string.max': 'Search query cannot exceed 100 characters',
  }),
  filters: Joi.object().optional(),
  dateRange: Joi.object({
    start: Joi.date().iso().required().messages({
      'date.base': 'Start date must be a valid date',
      'any.required': 'Start date is required',
    }),
    end: Joi.date().iso().min(Joi.ref('start')).required().messages({
      'date.base': 'End date must be a valid date',
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required',
    }),
  }).optional(),
});

export const validateSearch = validate(searchSchema);

// File upload validation schema
export const fileUploadSchema = Joi.object({
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().max(100 * 1024 * 1024).required().messages({ // 100MB max
      'number.max': 'File size cannot exceed 100MB',
    }),
  }).required().messages({
    'any.required': 'File is required',
  }),
});

export const validateFileUpload = validate(fileUploadSchema);

// UUID validation middleware
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuid = req.params[paramName];
    const uuidSchema = Joi.string().uuid().required();
    
    const { error } = uuidSchema.validate(uuid);
    
    if (error) {
      throw new ValidationError(`Invalid ${paramName} format`);
    }
    
    next();
  };
};

// Date validation middleware
export const validateDate = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const date = req.params[paramName];
    const dateSchema = Joi.date().iso().required();
    
    const { error } = dateSchema.validate(date);
    
    if (error) {
      throw new ValidationError(`Invalid ${paramName} format`);
    }
    
    next();
  };
};

// Email validation middleware
export const validateEmail = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const email = req.params[paramName];
    const emailSchema = Joi.string().email().required();
    
    const { error } = emailSchema.validate(email);
    
    if (error) {
      throw new ValidationError(`Invalid ${paramName} format`);
    }
    
    next();
  };
};

// Custom validation for specific business rules
export const validateBusinessRules = {
  // Validate that end date is after start date
  dateRange: (startDateField: string, endDateField: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startDate = req.body[startDateField];
      const endDate = req.body[endDateField];
      
      if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        throw new ValidationError(`${endDateField} must be after ${startDateField}`);
      }
      
      next();
    };
  },

  // Validate that amount is positive
  positiveAmount: (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const amount = req.body[fieldName];
      
      if (amount !== undefined && amount <= 0) {
        throw new ValidationError(`${fieldName} must be greater than zero`);
      }
      
      next();
    };
  },

  // Validate that quantity is positive integer
  positiveInteger: (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const value = req.body[fieldName];
      
      if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        throw new ValidationError(`${fieldName} must be a positive integer`);
      }
      
      next();
    };
  },

  // Validate enum values
  enumValue: (fieldName: string, allowedValues: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const value = req.body[fieldName];
      
      if (value !== undefined && !allowedValues.includes(value)) {
        throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
      }
      
      next();
    };
  },
}; 