import { Request, Response } from 'express';

// @desc      用户注册
// @route     POST /auth/register
// @access    Private
const register = (req: Request, res: Response) => {
  res.send('register');
};

// @desc      用户登陆
// @route     POST /auth/login
// @access    Private
const login = (req: Request, res: Response) => {
  res.send('login');
};

export { register, login };
