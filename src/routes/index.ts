import express from 'express';
import auth from './auth';

const router = express.Router();

router.route('/').get((req, res) => {
  res.send('ok');
});

router.use('/auth', auth);

export default router;
