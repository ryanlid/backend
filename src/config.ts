const config = {
  env: process.env.NODE_ENV || 'develoment',
  port: process.env.PORT || 3000,
  JWT_SWCRET: process.env.JWT_SECRET || 'YOUR_secret_key',
  JWT_EXPIRE:3600,
  mongoUri:
    process.env.MONGODB_URI ||
    process.env.MONGO_HOST ||
    'mongodb://' + (process.env.MONGO_PORT || '27017') + '/project',
};

export default config;
