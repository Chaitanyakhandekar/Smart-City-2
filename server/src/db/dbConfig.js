import mongoose from "mongoose";
import mongodb from "mongodb";
import dotenv from "dotenv"

dotenv.config({path:"./.env"})

const connectDB = async () => {
  try {
    console.log("MongoDB connecting...");
    const connectionInfo = await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://chaitanyakhandekar95_db_user:x2rf4KIQZolv6xqQ@cluster0.3sryplr.mongodb.net/");
    console.log(`MongoDB connected successfully: ${connectionInfo.connection.host}`);
    console.log(`Database: ${connectionInfo.connection.name}`);
    return connectionInfo;
  } catch (error) {
    console.error("MongoDB connection error: ", error.message);
    throw error;
  }
};

export default connectDB;
