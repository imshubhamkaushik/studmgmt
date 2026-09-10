import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../db/dynamo-client.js";

const STUDENTS_TABLE = "Students";
const UNIQUE_TABLE = "UniqueConstraints";
const COUNTERS_TABLE = "Counters";

// --- studentId generation -------------------------------------------
// Mongo version uses a Counter collection + findOneAndUpdate($inc).
// DynamoDB's UpdateItem with ADD is the direct, atomic equivalent —
// no read-modify-write race, no separate lock needed.
async function nextStudentId() {
  const result = await ddb.send(
    new UpdateCommand({
      TableName: COUNTERS_TABLE,
      Key: { counterName: "studentId" },
      UpdateExpression: "ADD sequenceValue :inc",
      ExpressionAttributeValues: { ":inc": 1 },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  const seq = result.Attributes.sequenceValue;
  return `STU${String(seq).padStart(6, "0")}`; // e.g. STU000042
}

// --- create -----------------------------------------------------------
// Enforces the three uniqueness rules the Mongo schema had as indexes:
//   studentId          -> guaranteed by the atomic counter, no check needed
//   admissionNo         -> unique, sparse (only checked if provided)
//   class+section+rollNo -> unique
// All three are enforced with ONE transaction: the student item plus
// up to two "claim" items in UniqueConstraints, each conditioned on
// attribute_not_exists so a duplicate write fails the whole transaction
// atomically instead of leaving a half-written student behind.
export async function createStudent(input) {
  const studentId = await nextStudentId();
  const now = new Date().toISOString();
  const classSection = `${input.class}#${input.section}`;

  const item = {
    studentId,
    name: input.name,
    rollNo: input.rollNo,
    class: input.class,
    section: input.section,
    classSection, // denormalized for GSI1
    status: input.status ?? "active",
    admissionNo: input.admissionNo ?? null,
    dob: input.dob,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const transactItems = [
    {
      Put: {
        TableName: STUDENTS_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(studentId)",
      },
    },
    {
      Put: {
        TableName: UNIQUE_TABLE,
        Item: {
          constraintKey: `classSectionRollNo#${input.class}#${input.section}#${input.rollNo}`,
        },
        ConditionExpression: "attribute_not_exists(constraintKey)",
      },
    },
  ];

  if (input.admissionNo) {
    transactItems.push({
      Put: {
        TableName: UNIQUE_TABLE,
        Item: { constraintKey: `admissionNo#${input.admissionNo}` },
        ConditionExpression: "attribute_not_exists(constraintKey)",
      },
    });
  }

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (err) {
    if (err.name === "TransactionCanceledException") {
      throw new Error(
        "Duplicate roll number in this class/section, or admission number already in use.",
      );
    }
    throw err;
  }

  return item;
}

// --- read by id ---------------------------------------------------------
export async function getStudentById(studentId) {
  const result = await ddb.send(
    new GetCommand({ TableName: STUDENTS_TABLE, Key: { studentId } }),
  );
  return result.Item ?? null;
}

// --- list by class + section (mirrors the most common query in the app) -
// Mongo: Student.find({ class, section, isDeleted: false, status }).sort({rollNo:1})
// DynamoDB: Query on GSI1 (already sorted by rollNo via the sort key),
// then filter isDeleted/status server-side in the same request. At this
// app's scale (a class/section rarely exceeds a few dozen students) a
// FilterExpression on an already-narrow partition is the right tool —
// it's not a full table Scan, just filtering within one query's results.
export async function listStudentsByClassSection(
  classValue,
  section,
  { status, includeDeleted = false } = {},
) {
  const filters = [];
  const values = { ":cs": `${classValue}#${section}` };

  if (!includeDeleted) {
    filters.push("isDeleted = :isDeleted");
    values[":isDeleted"] = false;
  }
  if (status) {
    filters.push("#status = :status");
    values[":status"] = status;
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: STUDENTS_TABLE,
      IndexName: "GSI1_ByClassSection",
      KeyConditionExpression: "classSection = :cs",
      FilterExpression: filters.length ? filters.join(" AND ") : undefined,
      ExpressionAttributeValues: values,
      ExpressionAttributeNames: status ? { "#status": "status" } : undefined,
    }),
  );
  return result.Items;
}

// --- update -------------------------------------------------------------
// studentId and admissionNo are immutable in the Mongo schema too, so
// they're intentionally excluded from the updatable field set here.
const UPDATABLE_FIELDS = ["name", "rollNo", "class", "section", "status", "dob"];

export async function updateStudent(studentId, patch) {
  const fields = Object.keys(patch).filter((k) => UPDATABLE_FIELDS.includes(k));
  if (fields.length === 0) return getStudentById(studentId);

  const names = {};
  const values = { ":updatedAt": new Date().toISOString() };
  const sets = ["updatedAt = :updatedAt"];

  for (const field of fields) {
    names[`#${field}`] = field;
    values[`:${field}`] = patch[field];
    sets.push(`#${field} = :${field}`);
  }

  // If class/section/rollNo changed, classSection (the GSI1 key) must
  // be recomputed too — easy to forget since it's a derived attribute.
  if (fields.includes("class") || fields.includes("section")) {
    const current = await getStudentById(studentId);
    const newClass = patch.class ?? current.class;
    const newSection = patch.section ?? current.section;
    names["#classSection"] = "classSection";
    values[":classSection"] = `${newClass}#${newSection}`;
    sets.push("#classSection = :classSection");
  }

  const result = await ddb.send(
    new UpdateCommand({
      TableName: STUDENTS_TABLE,
      Key: { studentId },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(studentId)",
      ReturnValues: "ALL_NEW",
    }),
  );
  return result.Attributes;
}

// --- soft delete ----------------------------------------------------------
export async function softDeleteStudent(studentId) {
  await ddb.send(
    new UpdateCommand({
      TableName: STUDENTS_TABLE,
      Key: { studentId },
      UpdateExpression: "SET isDeleted = :true, deletedAt = :now",
      ExpressionAttributeValues: {
        ":true": true,
        ":now": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(studentId)",
    }),
  );
}
