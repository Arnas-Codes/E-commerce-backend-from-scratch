import mongoose from "mongoose";

const connectTestDB = async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log("Test MongoDb connected");
};

export default connectTestDB;
