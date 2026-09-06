import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { verifyAccessToken } from "../../shared/jwt.mjs";

const ALLOWED_ROLES = new Set(["admin", "staff"]);

function jsonResponse(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

// Core logic, independent of the Lambda Function URL event shape and with
// its AWS clients passed in — this is what's unit tested, with fake
// clients standing in for S3/DynamoDB rather than making real AWS calls.
export async function createUploadUrl({ authorizationHeader, bucket, jobsTable, jwtSecret, s3Client, docClient }) {
  const token = String(authorizationHeader || "").replace(/^Bearer\s+/i, "");

  let payload;
  try {
    payload = verifyAccessToken(token, jwtSecret);
  } catch {
    return jsonResponse(401, { success: false, message: "Invalid or expired token." });
  }

  if (!ALLOWED_ROLES.has(payload.role)) {
    return jsonResponse(403, { success: false, message: "Only admin or staff can import students." });
  }

  const jobId = randomUUID();
  const key = `uploads/${payload.sub}/${jobId}.csv`;

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "text/csv" }),
    { expiresIn: 300 },
  );

  await docClient.send(
    new PutCommand({
      TableName: jobsTable,
      Item: {
        jobId,
        status: "awaiting_upload",
        createdBy: payload.sub,
        createdAt: new Date().toISOString(),
      },
    }),
  );

  return jsonResponse(200, { success: true, data: { uploadUrl, jobId, key, expiresIn: 300 } });
}

// Thin adapter for a Lambda Function URL invocation — constructs real AWS
// clients and normalizes the header casing Function URLs can send.
export const handler = async (event) => {
  const headers = event.headers || {};
  const authorizationHeader = headers.authorization || headers.Authorization;

  return createUploadUrl({
    authorizationHeader,
    bucket: process.env.IMPORTS_BUCKET,
    jobsTable: process.env.JOBS_TABLE,
    jwtSecret: process.env.JWT_SECRET,
    s3Client: new S3Client({}),
    docClient: DynamoDBDocumentClient.from(new DynamoDBClient({})),
  });
};
