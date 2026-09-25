import mongoose from "mongoose";

mongoose.set("sanitizeFilter", true);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Database connection failed");
    console.error(error.message);
  }
};

export default connectDB;
