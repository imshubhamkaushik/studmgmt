import { Counter } from "../models/counter.model.js";

const STUDENT_ID_PREFIX = "STU";

export const generateStudentId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    "studentIdSequence",
    {
      $inc: {
        sequenceValue: 1,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  const sequence = String(counter.sequenceValue).padStart(6, "0");

  return `${STUDENT_ID_PREFIX}-${sequence}`;
};
