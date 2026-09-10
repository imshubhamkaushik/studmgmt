import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// IS_OFFLINE / DYNAMODB_LOCAL is the only thing that differs between
// local dev and Lambda. Everything else — table names, item shapes,
// query logic in the repositories — is identical in both environments.
const isLocal = process.env.DYNAMODB_LOCAL === "true";

const baseClient = new DynamoDBClient(
  isLocal
    ? {
        endpoint: "http://localhost:8000",
        region: "us-east-1",
        credentials: { accessKeyId: "local", secretAccessKey: "local" },
      }
    : {}, // in Lambda: picks up region + IAM role creds automatically
);

// marshalling options: strip undefined attributes instead of throwing,
// since optional fields (e.g. admissionNo) are common in this schema
export const ddb = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: { removeUndefinedValues: true },
});
