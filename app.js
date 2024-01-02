// Import necessary modules
import express from "express";
import { connect, Schema, model } from "mongoose";
import { json } from "body-parser";

// Create an Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON requests
app.use(json());

// Middleware to serve static files from the "public" directory
app.use(express.static("public"));

// Connect to MongoDB
connect("mongodb://localhost:27017/studDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Student Schema using Mongoose
const studSchema = new Schema({
  name: String,
  rollNo: Number,
  sClass: String,
  dob: Date,
});

// Create a Mongoose model based on the schema
const Student = model("Student", studSchema);

// Define routes

// GET endpoint to retrieve all students
app.get("/students", async (req, res) => {
  try {
    // Retrieve all students from the database
    const students = await Student.find();

    // Send a JSON response with the list of students
    res.status(200).json(students);
  } catch (err) {
    // If an error occurs, send a 400 Bad Request response with the error message
    res.status(400).json({ message: err.message });
  }
});

// DELETE endpoint to delete a student by ID
app.delete("/students/:id", async (req, res) => {
  const studId = req.params.id;
  try {
    // Attempt to find and delete the student by ID
    const deletedStudent = await Student.findByIdAndDelete(studId);

    // If the student is not found, send a 404 Not Found response
    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    // If deletion is successful, send a 204 No Content response
    res.status(204).send();
  } catch (err) {
    // If an error occurs during deletion, send a 500 Internal Server Error response
    res.status(500).json({ message: "Error in deleting the student" });
  }
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
