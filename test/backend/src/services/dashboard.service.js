import { Student } from "../models/student.model.js";

export const getDashboardStats = async () => {
  const [totalStudents, studentsByClass, recentStudents] = await Promise.all([
    Student.countDocuments(),

    Student.aggregate([
      {
        $group: {
          _id: "$class",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
          _id: 1,
        },
      },
    ]),

    Student.find()
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .select("studentId name rollNo class dob createdAt")
      .lean(),
  ]);

  return {
    totalStudents,

    studentsByClass: studentsByClass.map((item) => ({
      class: item._id,
      count: item.count,
    })),

    recentStudents,
  };
};
