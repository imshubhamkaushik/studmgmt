import express from "express";
import mongoose from "mongoose";

const app = express();

app.disable("x-powered-by");

const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/studDB";

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Student Schema
const studSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    rollNo: {
      type: Number,
      required: true,
      min: 1,
    },

    sClass: {
      type: String,
      required: true,
      trim: true,
    },

    dob: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Student Model
const Student = mongoose.model("Student", studSchema);

// GET /students
app.get("/students", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });

    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);

    res.status(500).json({
      message: "Failed to fetch students",
    });
  }
});

// POST /students
app.post("/students", async (req, res) => {
  try {
    const { name, rollNo, sClass, dob } = req.body;

    if (!name || rollNo === undefined || !sClass || !dob) {
      return res.status(400).json({
        message: "Name, roll number, class and date of birth are required",
      });
    }

    const parsedRollNo = Number(rollNo);

    if (!Number.isInteger(parsedRollNo) || parsedRollNo <= 0) {
      return res.status(400).json({
        message: "Roll number must be a positive integer",
      });
    }

    const student = new Student({
      name,
      rollNo: parsedRollNo,
      sClass,
      dob,
    });

    const savedStudent = await student.save();

    res.status(201).json(savedStudent);
  } catch (error) {
    console.error("Error adding student:", error);

    res.status(500).json({
      message: "Failed to add student",
    });
  }
});

// DELETE /students/:id
app.delete("/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedStudent = await Student.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting student:", error);

    res.status(500).json({
      message: "Failed to delete student",
    });
  }
});

// Unknown route
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Connect to MongoDB before starting server
try {
  await mongoose.connect(MONGODB_URI);

  console.log("Connected to MongoDB");

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    console.log(`Open http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Failed to connect to MongoDB:", error);

  process.exit(1);
}
