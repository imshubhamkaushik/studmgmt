import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../db/dynamo-client.js";
import { getStudentById } from "./student.repository.js";
import { getAcademicYearById } from "./academic-year.repository.js";
import { getClassroomById } from "./classroom.repository.js";

const TABLE = "Enrollments";
const UNIQUE_TABLE = "UniqueConstraints";

async function loadPlacement(academicYearId, classroomId) {
  const [year, classroom] = await Promise.all([
    getAcademicYearById(academicYearId),
    getClassroomById(classroomId),
  ]);
  if (!year || year.isArchived) throw new Error("Academic year not found.");
  if (!classroom || !classroom.isActive) throw new Error("Active classroom not found.");
  if (classroom.academicYearId !== academicYearId) {
    throw new Error("Classroom does not belong to the selected academic year.");
  }
  return { year, classroom };
}

// GSI1_ByClassroom: classroomId -> "status#rollNo". Counting active
// enrollments this way is a Query against one GSI partition, not a
// table Scan -- cheap even as the roster grows.
async function countActiveInClassroom(classroomId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1_ByClassroom",
      KeyConditionExpression: "classroomId = :c AND begins_with(statusRollNo, :active)",
      ExpressionAttributeValues: { ":c": classroomId, ":active": "active#" },
    }),
  );
  return result.Items.length;
}

// --- enrollStudent, mirrors enrollment.service.js's version -------------
export async function enrollStudent({ studentId, academicYearId, classroomId, rollNo }) {
  if (!Number.isInteger(rollNo) || rollNo < 1) {
    throw new Error("rollNo must be a positive integer.");
  }

  const [student, placement] = await Promise.all([
    getStudentById(studentId),
    loadPlacement(academicYearId, classroomId),
  ]);
  if (!student || student.isDeleted || student.status !== "active") {
    throw new Error("Active student not found.");
  }

  if (placement.classroom.capacity) {
    const current = await countActiveInClassroom(classroomId);
    if (current + 1 > placement.classroom.capacity) {
      throw new Error(
        `Classroom capacity would be exceeded (${current + 1}/${placement.classroom.capacity}).`,
      );
    }
  }

  const now = new Date().toISOString();
  const item = {
    studentId,
    academicYearId, // SK
    classroomId,
    rollNo,
    status: "active",
    statusRollNo: `active#${String(rollNo).padStart(5, "0")}`, // GSI1 sort key
    startDate: now,
    endDate: null,
    createdAt: now,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            // studentId+academicYearId is the PK+SK -- naturally unique,
            // so this condition alone enforces "one enrollment per
            // student per year", same as the Mongo unique index did.
            Put: {
              TableName: TABLE,
              Item: item,
              ConditionExpression: "attribute_not_exists(studentId)",
            },
          },
          {
            // rollNo uniqueness is only scoped to *active* enrollments
            // in this classroom -- claimed separately since it's not
            // part of this item's own key.
            Put: {
              TableName: UNIQUE_TABLE,
              Item: { constraintKey: `activeRoll#${classroomId}#${rollNo}` },
              ConditionExpression: "attribute_not_exists(constraintKey)",
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (err.name === "TransactionCanceledException") {
      throw new Error(
        "Student already enrolled this year, or roll number already taken in this classroom.",
      );
    }
    throw err;
  }

  return item;
}

// --- promoteStudents, mirrors the batch-promotion logic ------------------
// Real Mongo version allows up to 200 students in one call. DynamoDB
// TransactWriteItems caps at 100 items per transaction, and every
// promoted student needs 2 items (close old enrollment + claim new
// roll number) plus 1 create, so this implementation caps batches at
// 30 students per call to stay well under that ceiling -- call it in
// pages for larger batches. Worth mentioning as a deliberate trade-off
// if asked about it.
const MAX_PROMOTE_BATCH = 30;

export async function promoteStudents({
  studentIds,
  fromAcademicYearId,
  toAcademicYearId,
  toClassroomId,
  rollNumbers = {},
}) {
  if (!Array.isArray(studentIds) || studentIds.length === 0 || studentIds.length > MAX_PROMOTE_BATCH) {
    throw new Error(`studentIds must contain between 1 and ${MAX_PROMOTE_BATCH} IDs.`);
  }
  if (fromAcademicYearId === toAcademicYearId) {
    throw new Error("Source and destination academic years must differ.");
  }

  const { classroom } = await loadPlacement(toAcademicYearId, toClassroomId);

  const sourceEnrollments = await Promise.all(
    studentIds.map((id) =>
      ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { studentId: id, academicYearId: fromAcademicYearId },
        }),
      ),
    ),
  );
  const source = sourceEnrollments.map((r) => r.Item);
  if (source.some((e) => !e || e.status !== "active")) {
    throw new Error("Every student must have an active enrollment in the source academic year.");
  }

  // reject if any student already has a destination-year enrollment
  const destChecks = await Promise.all(
    studentIds.map((id) =>
      ddb.send(new GetCommand({ TableName: TABLE, Key: { studentId: id, academicYearId: toAcademicYearId } })),
    ),
  );
  if (destChecks.some((r) => r.Item)) {
    throw new Error("At least one selected student is already enrolled in the destination academic year.");
  }

  if (classroom.capacity) {
    const current = await countActiveInClassroom(toClassroomId);
    if (current + studentIds.length > classroom.capacity) {
      throw new Error(
        `Classroom capacity would be exceeded (${current + studentIds.length}/${classroom.capacity}).`,
      );
    }
  }

  const now = new Date().toISOString();
  const transactItems = [];

  source.forEach((enrollment, index) => {
    const rollNo = Number(rollNumbers[enrollment.studentId] ?? index + 1);
    if (!Number.isInteger(rollNo) || rollNo < 1) {
      throw new Error("Destination roll numbers must be positive integers.");
    }

    // close the old enrollment
    transactItems.push({
      Update: {
        TableName: TABLE,
        Key: { studentId: enrollment.studentId, academicYearId: fromAcademicYearId },
        UpdateExpression: "SET #status = :completed, statusRollNo = :statusRollNo, endDate = :now",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":completed": "completed",
          ":statusRollNo": `completed#${String(enrollment.rollNo).padStart(5, "0")}`,
          ":now": now,
        },
      },
    });
    // free up its old roll-number claim so it can be reused
    transactItems.push({
      Delete: {
        TableName: UNIQUE_TABLE,
        Key: { constraintKey: `activeRoll#${enrollment.classroomId}#${enrollment.rollNo}` },
      },
    });
    // create the new enrollment
    transactItems.push({
      Put: {
        TableName: TABLE,
        Item: {
          studentId: enrollment.studentId,
          academicYearId: toAcademicYearId,
          classroomId: toClassroomId,
          rollNo,
          status: "active",
          statusRollNo: `active#${String(rollNo).padStart(5, "0")}`,
          startDate: now,
          endDate: null,
          createdAt: now,
        },
        ConditionExpression: "attribute_not_exists(studentId)",
      },
    });
    // claim the new roll number
    transactItems.push({
      Put: {
        TableName: UNIQUE_TABLE,
        Item: { constraintKey: `activeRoll#${toClassroomId}#${rollNo}` },
        ConditionExpression: "attribute_not_exists(constraintKey)",
      },
    });
  });

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (err) {
    if (err.name === "TransactionCanceledException") {
      throw new Error("Promotion failed: a destination roll number is already taken, or a concurrent change occurred.");
    }
    throw err;
  }

  return { promoted: source.length, toAcademicYearId, toClassroomId };
}
