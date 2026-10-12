require('dotenv').config();
const mongoose = require('mongoose');

mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('CONNECTED');
    process.exit(0);
  })
  .catch((e) => {
    console.log(e.message);
    if (e.reason && e.reason.servers) {
      for (const [addr, s] of e.reason.servers) {
        console.log(addr, '->', s.error ? s.error.message : s.type);
      }
    }
    process.exit(1);
  });