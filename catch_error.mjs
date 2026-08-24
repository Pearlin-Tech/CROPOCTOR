import express from 'express';
import cors from 'cors';
import fs from 'fs';
const app = express();
app.use(cors());
app.use(express.text());
app.post('/', (req, res) => {
  fs.writeFileSync('THE_ERROR.txt', req.body);
  res.send('ok');
});
app.listen(9999, () => console.log('Listening on 9999'));
