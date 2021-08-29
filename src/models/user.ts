import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import config from '../config';
import ErrorResponse from '../utils/errorResponse';

enum Role {
  'user' = 'user',
  'editor' = 'editor',
  'admin' = 'admin',
}

type matchPasswordFuntion = (enteredPassword: string) => boolean;
type getSignedJwtTokenFuntion = () => string;

export type UserDocument = mongoose.Document & {
  username: string;
  nameInsensitive: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  resetPasswordCode: string;
  resetPasswordCodeRemaining: number;
  resetPasswordCodeExpire: string;
  createdAt: Date;
  gravatar: (size: number) => string;
  getSignedJwtToken: getSignedJwtTokenFuntion;
  matchPassword: matchPasswordFuntion;
};

const userSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      unique: true,
      required: [true, '请输入用户名'],
      validate: [
        /^[\u4e00-\u9fa5a-zA-Z0-9_]{3,20}$/,
        '用户名只能是中英文、数字、下划线，3-20个字符',
      ],
      minlength: [3, '用户名至少3个字符'],
      maxlength: [20, '用户名最长 20 个字符'],
    },

    // 不区分大小写的用户名
    nameInsensitive: {
      type: String,
      unique: true,
      // required: [true, '请输入用户名'],
      validate: [
        /^[\u4e00-\u9fa5a-zA-Z0-9_]{3,20}$/,
        '用户名只能是中英文、数字、下划线，3-20个字符',
      ],
      minlength: [3, '用户名至少3个字符'],
      maxlength: [20, '用户名最长 20 个字符'],
    },
    email: {
      type: String,
      unique: true,
      validate: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请输入合法的 Email 地址'],
    },
    phone: {
      type: String,
      unique: true,
      validate: [/^(13|14|15|16|17|18|19)\d{9}$/, '请输入合法的手机号'],
    },
    role: {
      type: String,
      enum: ['user', 'editor', 'admin'],
      default: Role.user,
    },
    password: {
      type: String,
      required: [true, '请填写密码'],
      minlength: [6, '密码长度为6-16个字符'],
      maxlength: [16, '密码长度为6-16个字符'],
      select: false,
    },
    resetPasswordCode: String,
    // 重置密码剩余使用次数，获取新的code，恢复次数
    resetPasswordCodeRemaining: Number,
    // 重置密码code 过期时间
    resetPasswordCodeExpire: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// 通过 bcrypt 加密密码
userSchema.pre('save', async function save(next) {
  if (
    this.username.startsWith('1') &&
    this.username.length === 11 &&
    /^(1)\d{10}$/.test(this.username)
  ) {
    next(
      new ErrorResponse(
        '请不要使用以数字 1 开头且长度为 11 位字符作为用户名',
        400
      )
    );
  } else {
    // 不区分大小写的用户名
    this.nameInsensitive = this.username.toLowerCase();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  }
});

userSchema.post('save', (error: any, doc: any, next: any) => {
  if (!doc.phone && !doc.email) {
    next(new ErrorResponse('Email 与手机号至少需要填写一项', 400));
    return;
  }
  if (error && error.name === 'MongoServerError' && error.code === 11000) {
    if (error.keyPattern.username === 1) {
      next(new ErrorResponse('该 用户名 已经被注册', 400));
    } else if (error.keyPattern.nameInsensitive) {
      next(new ErrorResponse('该 用户名 已经被注册', 400));
    } else if (error.keyPattern.email === 1) {
      next(new ErrorResponse('该 Email 已经被注册', 400));
    } else if (error.keyPattern.phone === 1) {
      next(new ErrorResponse('该 手机号 已经被注册', 400));
    }
    next(error);
  } else {
    next();
  }
});

// 生成 JWT
userSchema.methods.getSignedJwtToken = function getSignedJwtToken() {
  /* eslint-disable-next-line no-underscore-dangle */
  return jwt.sign({ id: this._id }, config.JWT_SWCRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

// 比对用户输入密码和数据库中保存的密码
userSchema.methods.matchPassword = function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model<UserDocument>('users', userSchema);
