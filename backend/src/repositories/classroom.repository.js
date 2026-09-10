import { GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { ddb } from "../db/dynamo-client.js";
import { getAcademicYearById } from "./academic-year.repository.js";

const TABLE = "Classrooms";
const UNIQUE_TABLE = "UniqueConstraints";

export async function getClassroomById(classroomId) {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { classroomId } }),
  );
  return result.Item ?? null;
}

// GSI1_ByAcademicYear: academicYearId -> classNameSection, matches
// listClassrooms({academicYear}) in the real controller.
export async function listClassroomsByAcademicYear(academicYearId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1_ByAcademicYear",
      KeyConditionExpression: "academicYearId = :y",
      ExpressionAttributeValues: { ":y": academicYearId },
    }),
  );
  return result.Items;
}

export async function createClassroom({ className, section, academicYearId, capacity }) {
  const year = await getAcademicYearById(academicYearId);
  if (!year || year.isArchived) {
    throw new Error("Academic year not found.");
  }

  const classroomId = randomUUID();
  const now = new Date().toISOString();
  const item = {
    classroomId,
    className,
    section,
    academicYearId,
    classNameSection: `${className}#${section}`, // GSI1 sort key
    capacity: capacity ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE,
              Item: item,
              ConditionExpression: "attribute_not_exists(classroomId)",
            },
          },
          {
            Put: {
              TableName: UNIQUE_TABLE,
              Item: {
                constraintKey: `classroom#${academicYearId}#${className}#${section}`,
              },
              ConditionExpression: "attribute_not_exists(constraintKey)",
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (err.name === "TransactionCanceledException") {
      throw new Error("This class/section already exists for that academic year.");
    }
    throw err;
  }

  return item;
}
