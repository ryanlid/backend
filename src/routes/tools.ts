import express from 'express';
const router = express.Router();

router.route('/ua').get((req, res) => {
  res.send(req.headers['user-agent']);
});

router.route('/ip').get((req, res) => {
  res.send(req.ip);
});

router.route('/headers').get((req, res) => {
  res.send(req.headers);
});

export default router;
