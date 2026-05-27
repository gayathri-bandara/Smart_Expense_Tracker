const mongoose = require("mongoose");

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const localUri =
    process.env.MONGO_URI_LOCAL || "mongodb://127.0.0.1:27017/expense-tracker";

  if (!primaryUri) {
    throw new Error("MONGO_URI is not set in backend/.env");
  }

  try {
    await mongoose.connect(primaryUri);
    console.log("MongoDB Connected ✅");
    return;
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("MongoDB connection failed:", error.message);
      throw error;
    }

    console.warn(
      `Primary MongoDB failed (${error.message}). Trying local database...`
    );

    try {
      await mongoose.connect(localUri);
      console.log(`MongoDB Connected (local) ✅ ${localUri}`);
    } catch (localError) {
      console.error("MongoDB connection failed:", localError.message);
      if (error.message.includes("whitelist") || error.message.includes("IP")) {
        console.error(
          "Atlas blocked this IP, and local MongoDB is unavailable. Start MongoDB locally or whitelist your IP in Atlas."
        );
      }
      throw localError;
    }
  }
};

module.exports = connectDB;