const mongoose = require("mongoose");

async function connectDatabase(uri) {
    if (!uri) {
        console.warn("MongoDB disabled: MONGO_URI is not configured.");
        return null;
    }

    mongoose.set("strictQuery", true);

    const connection = await mongoose.connect(uri);
    console.log("MongoDB Connected");
    return connection;
}

module.exports = {
    connectDatabase
};
