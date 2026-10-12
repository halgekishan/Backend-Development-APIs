const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);


const mongoose = require('mongoose');

const connectDB = async (uri = process.env.MONGO_URI) => {
  if (!uri) {
    throw new Error('MONGO_URI is not defined. Create a .env file (see .env.example).');
  }
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri);
  if (process.env.NODE_ENV !== 'test') {
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  }
  return conn;
};

module.exports = connectDB;
