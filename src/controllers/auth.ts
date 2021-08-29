import { Request, Response, NextFunction } from 'express';
import { User, UserDocument } from '../models/user';
import ErrorResponse from '../utils/errorResponse';
import Mail from '../utils/mail'

const sendTokenResponse = (
  user: UserDocument,
  statusCode: number,
  res: Response
) => {
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    user: user,
    success: true,
    message: '获取用户 token',
    token,
    data: { token },
  });
};

async function sendMail(to:string, code:string) {
  const subject = '一点快乐|验证您的电子邮件地址';
  const html = `<p>您好：</p>
  <p>您重置密码的验证码为:</p>
  <p><span style="font-weight: bold;font-size: 130%;">${code}</span></p>
  <p>有效期10分钟，请尽快填写</p>
  <p>感谢使用 ^_^</p>
  <p>
    收到本邮件是因为您在<a href="https://www.yidiankuaile.com">一点快乐</a>
    注册过账号，如果不是本人操作请忽略本邮件
  </p>
  `;
  const result = await Mail({ to, subject, html });
  return result;
}


// @desc      用户注册
// @route     POST /auth/register
// @access    Private
const register = async (req: Request, res: Response, next: NextFunction) => {
  const user = new User(req.body);

  try {
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc      用户登陆
// @route     POST /auth/login
// @access    Private
const login = async (req: Request, res: Response, next: NextFunction) => {
  // res.send('login');
  const { loginname, password } = req.body;

  // 验证用户名 & 密码
  if (!loginname) {
    next(new ErrorResponse('请输入 用户名 或 Email 或手机号，', 400));
    return;
  }
  if (!password) {
    next(new ErrorResponse('请输入密码', 400));
    return;
  }

  let user: UserDocument;

  if (loginname.indexOf('@') !== -1) {
    // 邮箱登录
    user = (await User.findOne({ email: loginname }).select(
      '+password'
    )) as UserDocument;
  } else if (
    loginname.startsWith('1') &&
    loginname.length === 11 &&
    /^(1)\d{10}$/.test(loginname)
  ) {
    // 手机登录
    user = (await User.findOne({ phone: loginname }).select(
      '+password'
    )) as UserDocument;
  } else {
    // 用户名登录
    user = (await User.findOne({ username: loginname }).select(
      '+password'
    )) as UserDocument;
  }

  if (!user) {
    next(new ErrorResponse('用户信息有误', 400));
    return;
  }

  // 验证密码是否正确
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    next(new ErrorResponse('邮箱或密码有误', 400));
    return;
  }

  sendTokenResponse(user, 200, res);
};

// @desc      用户退出登录
// @route     POST /auth/logout
// @access    Private
const logout = async (req: Request, res: Response, next: NextFunction) => {
  // TODO 实现退出功能
  res.status(200).json({
    success: true,
    message: '退出成功',
  });
};

type constRequest = Request & { user: UserDocument; body: {} };

// @desc      通过原密码修改密码
// @route     POST /auth/changepassword
// @access    Private
const changePassword = async (
  req: constRequest,
  res: Response,
  next: NextFunction
) => {
  const { password, newPassword } = req.body;

  // 验证密码输入
  if (!password) {
    next(new ErrorResponse('请输入原密码，', 400));
    return;
  }
  if (!newPassword) {
    next(new ErrorResponse('请输入新密码，', 400));
    return;
  }
  const user = (await User.findById(req.user.id).select(
    '+password'
  )) as UserDocument;

  try {
    // 验证密码是否正确
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      next(new ErrorResponse('原密码有误', 400));
      return;
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({
      success: true,
      message: '修改密码成功',
    });
  } catch (error) {
    next(error);
  }
};


// @desc      通过邮件、短信获取验证码
// @route     GET /auth/resetpassword
// @access    Private
const getResetPasswordCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const code = Math.random().toString().substring(2, 8);
  const loginname = req.query.loginname as string;
  // 验证用户名
  if (!loginname) {
    next(new ErrorResponse('请输入 用户名 或 Email 或手机号，', 400));
    return;
  }

  let user;
  let result;
  let target = '';
  // 发送类型：email、sms
  let sendType;
  const updateOption = {
    resetPasswordCode: code,
    // 剩余重置次数
    resetPasswordCodeRemaining: 5,
    // 十分钟
    resetPasswordCodeExpire: Date.now() + 10 * 60 * 1000,
  };

  try {
    if (loginname.indexOf('@') !== -1) {
      // 邮箱
      user = await User.findOneAndUpdate(
        { email: loginname },
        {
          $set: updateOption,
        }
      );
      sendType = 'email';
    } else if (
      loginname.startsWith('1') &&
      loginname.length === 11 &&
      /^(1)\d{10}$/.test(loginname)
    ) {
      // 手机
      user = await User.findOneAndUpdate(
        { phone: loginname },
        {
          $set: updateOption,
        }
      );
      sendType = 'sms';
    } else {
      // 用户名
      user = await User.findOneAndUpdate(
        { name: loginname },
        {
          $set: updateOption,
        }
      );
      sendType = 'auto';
    }

    if (!user) {
      next(new ErrorResponse('该用户不存在', 400));
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      // if (process.env.NODE_ENV === 'development') {
      // 如果是手机号查找，且存在手机号，通过短信发送验证码
      // 通过 email 或用户名查找，优先使用邮箱发送验证码
      if (user.phone && sendType === 'sms') {
        result = await SMS(user.phone, code);
        target = user.phone.replace(
          /^(\d{3})(\d+)(\d{3})$/,
          (st, p1, p2, p3) => {
            const p = p2.replace(/[^\s]/g, '*');
            return [p1, p, p3].join('');
          }
        );
        // target = user.phone.replace(/(\d{3})\d{5}(\d{3})/,'$1****$2')
      } else if (user.email) {
        result = await sendMail(user.email, code);
        // /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        target = user.email.replace(
          /^([^\s@]{2})([^\s@]+)(@[^\s@]+\.[^\s@]+$)/,
          (st, p1, p2, p3) => {
            const p = p2.replace(/[^\s]/g, '*');
            return [p1, p, p3].join('');
          }
        );
      } else {
        next(
          new ErrorResponse('无法发送验证码，该账户没有绑定邮箱或手机', 400)
        );
      }

      if (result.result === true) {
        res.status(200).json({
          success: true,
          message: `验证码已经发送至 ${target}`,
        });
      } else {
        next(new ErrorResponse('验证码发送失败，请稍后再试', 400));
      }
    } else {
      res.status(200).json({
        success: true,
        message: 'development 获取验证码成功',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc      通过邮件、短信验证码重置密码
// @route     POST /auth/resetpassword
// @access    Private
const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { loginname, code, newPassword } = req.body;

  if (!code) {
    next(new ErrorResponse('请输入验证码', 400));
    return;
  }
  if (!newPassword) {
    next(new ErrorResponse('请输入新密码，', 400));
    return;
  }
  // const user = await User.findById(req.user.id);

  try {
    let user;

    if (loginname.indexOf('@') !== -1) {
      // 邮箱登录
      user = (await User.findOne({ email: loginname })) as UserDocument;
      if (!user) {
        next(new ErrorResponse('用户不存在', 400));
        return;
      }
      await User.findOneAndUpdate(
        { email: loginname },
        {
          $set: {
            resetPasswordCodeRemaining: user.resetPasswordCodeRemaining - 1,
          },
        }
      );
    } else if (
      loginname.startsWith('1') &&
      loginname.length === 11 &&
      /^(1)\d{10}$/.test(loginname)
    ) {
      // 手机登录
      user = await User.findOne({ phone: loginname });
      if (!user) {
        next(new ErrorResponse('用户不存在', 400));
        return;
      }
      await User.findOneAndUpdate(
        { phone: loginname },
        {
          $set: {
            resetPasswordCodeRemaining: user.resetPasswordCodeRemaining - 1,
          },
        }
      );
    } else {
      // 用户名登录
      user = await User.findOne({ name: loginname });
      if (!user) {
        next(new ErrorResponse('用户不存在', 400));
        return;
      }
      await User.findOneAndUpdate(
        { name: loginname },
        {
          $set: {
            resetPasswordCodeRemaining: user.resetPasswordCodeRemaining - 1,
          },
        }
      );
    }

    // 验证 验证码是否超过使用次数
    if (user.resetPasswordCodeRemaining < 1) {
      next(new ErrorResponse('验证码尝试超过使用次数，请重新获取验证码', 400));
      return;
    }

    // 验证 验证码是否过期
    if (Date.parse(user.resetPasswordCodeExpire) < Date.now()) {
      next(new ErrorResponse('验证码已过期，请重新获取', 400));
      return;
    }

    // 验证 验证码是否正确
    if (user.resetPasswordCode !== code) {
      next(new ErrorResponse('验证码不正确', 400));
      return;
    }

    // 重置剩余次数为0
    user.resetPasswordCodeRemaining = 0;
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: '重置密码成功',
    });
  } catch (error) {
    next(error);
  }
};

// @desc      获取我的用户信息
// @route     GET /auth/me
// @access    Private
const getMe = async (req: constRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      message: '获取我的用户信息',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export {
  register,
  login,
  logout,
  changePassword,
  getResetPasswordCode,
  resetPassword,
  getMe,
};
