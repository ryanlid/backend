import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/errorResponse';

export interface APIError {
  message: string;
  code: number;
  codeAsString?: string; //allow to override the default error code as string
  description?: string;
  documentation?: string;
}

interface errorType {
  message: string;
  statusCode: number;
}

const errorHander = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };

  error.message = err.message;

  // // log to console for dev
  // if (process.env.NODE_ENV === 'development') {
  // // eslint-disable-next-line no-console
  //   console.log(err.);
  // }

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    const message = `非法的的 ID: ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // // Mongoose validation error
  // if (err.name === 'ValidationError') {
  //   const message = Object.values(err.errors).map((val) => val.message);
  //   error = new ErrorResponse(message, 400);
  // }
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
  });
  next();
};

export default errorHander;
