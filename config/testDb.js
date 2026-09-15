import mongoose from "mongoose";

const connectTestDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_TEST_URI);

    console.log("Test MongoDb connected");
  } catch (error) {
    console.error("Test Database connection failed");
    console.error(error.message);
  }
};

export default connectTestDB;