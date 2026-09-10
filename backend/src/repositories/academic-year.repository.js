import {
  GetCommand,
  UpdateCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { ddb } from "../db/dynamo-client.js";

const TABLE = "AcademicYears";
const UNIQUE_TABLE = "UniqueConstraints";

// Table has no GSI (see design table) -- this app has at most a
// handful of academic years ever, so a full Scan for list/uniqueness
// lookups is the right call rather than paying for a GSI that would
// almost never be queried against more than a dozen items.
export async function listAcademicYears() {
  const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
  return result.Items;
}

export async function getAcademicYearById(academicYearId) {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { academicYearId } }),
  );
  return result.Item ?? null;
}

export async function createAcademicYear({ name, startDate, endDate }) {
  if (new Date(endDate) <= new Date(startDate)) {
    throw new Error("End date must be after start date.");
  }

  const academicYearId = randomUUID();
  const now = new Date().toISOString();
  const item = {
    academicYearId,
    name,
    startDate,
    endDate,
    isActive: false,
    isArchived: false,
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
              ConditionExpression: "attribute_not_exists(academicYearId)",
            },
          },
          {
            Put: {
              TableName: UNIQUE_TABLE,
              Item: { constraintKey: `academicYearName#${name}` },
              ConditionExpression: "attribute_not_exists(constraintKey)",
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (err.name === "TransactionCanceledException") {
      throw new Error(`Academic year "${name}" already exists.`);
    }
    throw err;
  }

  return item;
}

export async function setAcademicYearActive(academicYearId, isActive) {
  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { academicYearId },
      UpdateExpression: "SET isActive = :v, updatedAt = :now",
      ExpressionAttributeValues: { ":v": isActive, ":now": new Date().toISOString() },
      ConditionExpression: "attribute_exists(academicYearId)",
      ReturnValues: "ALL_NEW",
    }),
  );
  return result.Attributes;
}
