import cookieParser from 'cookie-parser';
import compress from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import errorHander from './middleware/error';

import config from './config.js';
import routes from './routes/index';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/test');
}

main().catch((err) => console.error(err));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compress());
app.use(cors());
app.use(helmet());

// app.use(express.static(path.join(__dirname, 'public')));

if (app.get('env') === 'production') {
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
}

// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

app.use('/', routes);
app.use(errorHander);

app.listen(config.port, () => {
  console.info(
    `Server started in ${process.env.NODE_ENV} mode on port ${config.port}.`
  );
});
