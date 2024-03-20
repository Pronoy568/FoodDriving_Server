const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("assignment");
    const collection = db.collection("users");
    const SuppliesCollection = db.collection("supplies");
    const gratitudeCollection = db.collection("gratitude");
    const testimonialCollection = db.collection("testimonial");

    // User Registration
    app.post("/api/auth/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/auth/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    // Supplies related apis

    app.get("/supplies", async (req, res) => {
      try {
        const result = await SuppliesCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        console.error("Error retrieving supplies:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/supplies", async (req, res) => {
      try {
        const supply = req.body;
        const result = await SuppliesCollection.insertOne(supply);

        // Check if the result is undefined
        if (!result) {
          return res
            .status(500)
            .json({ success: "Adding supply Successfully" });
        }

        // Check if the result object contains the inserted document
        if (!result.ops || result.ops.length === 0) {
          return res.status(500).json({ success: "Adding supply" });
        }

        // Send the inserted document as response
        res.status(201).json(result.ops[0]);
      } catch (error) {
        console.error("Error adding supply:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.delete("/supplies/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid ID" });
        }

        const query = { _id: new ObjectId(id) };
        const result = await SuppliesCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Document not found" });
        }

        res.status(200).json({ message: "Document deleted successfully" });
      } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/supplies/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid ID" });
        }

        const query = { _id: new ObjectId(id) };
        const supply = await SuppliesCollection.findOne(query);

        if (!supply) {
          return res.status(404).json({ error: "Supply not found" });
        }

        res.status(200).json(supply);
      } catch (error) {
        console.error("Error retrieving supply:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.put("/supplies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updates = req.body;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid ID" });
        }

        const query = { _id: new ObjectId(id) };
        const result = await SuppliesCollection.updateOne(query, {
          $set: {
            title: updates.title,
            quantity: updates.quantity,
            category: updates.category,
          },
        });

        if (result.modifiedCount === 0) {
          return res.status(404).json({ error: "Supply not found" });
        }

        res.status(200).json({ message: "Supply updated successfully" });
      } catch (error) {
        console.error("Error updating supply:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // ==============================================================
    // Gratitude related apis
    app.post("/create-gratitude", async (req, res) => {
      try {
        const gratitudeData = req.body;
        const result = await gratitudeCollection.insertOne(gratitudeData);
        res.status(201).json({
          success: true,
          message: "Gratitude created successfully",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "Gratitude create failed",
        });
      }
    });

    app.get("/gratitudes", async (req, res) => {
      try {
        const result = await gratitudeCollection.find().toArray();
        res.status(200).json({
          success: true,
          message: "Successfully retrieved gratitudes data",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "Gratitudes failed",
        });
      }
    });

    // ==============================================================
    // Testimonial related apis
    app.post("/create-testimonial", async (req, res) => {
      try {
        const testimonialData = req.body;
        const result = await testimonialCollection.insertOne(testimonialData);
        res.status(201).json({
          success: true,
          message: "Testimonial created successfully",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "Testimonial create failed",
        });
      }
    });

    app.get("/testimonial", async (req, res) => {
      try {
        const result = await testimonialCollection.find().toArray();
        res.status(200).json({
          success: true,
          message: "Successfully retrieved testimonial data",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "Testimonial failed",
        });
      }
    });
    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
