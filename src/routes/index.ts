import express from 'express';
import auth from './auth';
import tools from './tools';

const router = express.Router();

router.route('/').get((req, res) => {
  res.send('ok');
});

router.use('/auth', auth);
router.use('/tools', tools);

export default router;
