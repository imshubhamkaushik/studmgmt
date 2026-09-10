/**
 * Creates every table for the app. Run against DynamoDB Local for dev,
 * or point it at real AWS (remove --local flag) — same table defs
 * either way, which is the whole point of using DynamoDB Local instead
 * of an adapter/mock layer.
 *
 * Usage:
 *   node infra/create-tables.js --local
 *   node infra/create-tables.js            (uses real AWS creds/region)
 */
import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";

const isLocal = process.argv.includes("--local");

const client = new DynamoDBClient(
  isLocal
    ? {
        endpoint: "http://localhost:8000",
        region: "us-east-1",
        credentials: { accessKeyId: "local", secretAccessKey: "local" },
      }
    : {}, // real AWS: picks up region/creds from env or ~/.aws/config
);

const PAY_PER_REQUEST = { BillingMode: "PAY_PER_REQUEST" };

const tables = [
  {
    TableName: "Students",
    KeySchema: [{ AttributeName: "studentId", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "studentId", AttributeType: "S" },
      { AttributeName: "classSection", AttributeType: "S" },
      { AttributeName: "rollNo", AttributeType: "N" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1_ByClassSection",
        KeySchema: [
          { AttributeName: "classSection", KeyType: "HASH" },
          { AttributeName: "rollNo", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Attendance",
    KeySchema: [
      { AttributeName: "studentId", KeyType: "HASH" },
      { AttributeName: "date", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "studentId", AttributeType: "S" },
      { AttributeName: "date", AttributeType: "S" },
      { AttributeName: "classSection", AttributeType: "S" },
      { AttributeName: "dateStudentId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        // SK is "date#studentId" (both fixed-width/ISO, so it sorts
        // correctly). Supports both "give me one exact day" (begins_with)
        // and "give me a date range" (BETWEEN) in a single Query --
        // the single-day-only design from the first pass couldn't do
        // range summaries, which the real attendance.service.js needs.
        IndexName: "GSI1_ByClassSection",
        KeySchema: [
          { AttributeName: "classSection", KeyType: "HASH" },
          { AttributeName: "dateStudentId", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Enrollments",
    KeySchema: [
      { AttributeName: "studentId", KeyType: "HASH" },
      { AttributeName: "academicYearId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "studentId", AttributeType: "S" },
      { AttributeName: "academicYearId", AttributeType: "S" },
      { AttributeName: "classroomId", AttributeType: "S" },
      { AttributeName: "statusRollNo", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1_ByClassroom",
        KeySchema: [
          { AttributeName: "classroomId", KeyType: "HASH" },
          { AttributeName: "statusRollNo", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "AcademicYears",
    KeySchema: [{ AttributeName: "academicYearId", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "academicYearId", AttributeType: "S" },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Classrooms",
    KeySchema: [{ AttributeName: "classroomId", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "classroomId", AttributeType: "S" },
      { AttributeName: "academicYearId", AttributeType: "S" },
      { AttributeName: "classNameSection", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1_ByAcademicYear",
        KeySchema: [
          { AttributeName: "academicYearId", KeyType: "HASH" },
          { AttributeName: "classNameSection", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "Users",
    KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "email", AttributeType: "S" }],
    ...PAY_PER_REQUEST,
  },
  {
    // Refresh-token sessions. Mongo used a TTL index to auto-expire rows;
    // DynamoDB's native TTL (enabled post-creation via UpdateTimeToLive,
    // see bottom of this script) is the direct equivalent.
    TableName: "Sessions",
    KeySchema: [{ AttributeName: "tokenHash", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "tokenHash", AttributeType: "S" }],
    ...PAY_PER_REQUEST,
  },
  {
    TableName: "TeacherClassroomAssignments",
    KeySchema: [
      { AttributeName: "teacherId", KeyType: "HASH" },
      { AttributeName: "classroomId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "teacherId", AttributeType: "S" },
      { AttributeName: "classroomId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1_ByClassroom",
        KeySchema: [
          { AttributeName: "classroomId", KeyType: "HASH" },
          { AttributeName: "teacherId", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    // Enforces secondary uniqueness constraints DynamoDB doesn't give you
    // for free (admissionNo, class+section+rollNo, academic year name,
    // classroom name+section). One item per constraint, written inside
    // the same TransactWriteItems call as the real entity write, with
    // ConditionExpression: attribute_not_exists(constraintKey).
    TableName: "UniqueConstraints",
    KeySchema: [{ AttributeName: "constraintKey", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "constraintKey", AttributeType: "S" },
    ],
    ...PAY_PER_REQUEST,
  },
  {
    // Atomic sequence generator (studentId numbers). UpdateItem with
    // ADD is atomic in DynamoDB — no read-then-write race condition,
    // no separate locking needed, unlike a naive Mongo counter pattern.
    TableName: "Counters",
    KeySchema: [{ AttributeName: "counterName", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "counterName", AttributeType: "S" },
    ],
    ...PAY_PER_REQUEST,
  },
];

async function main() {
  const existing = await client.send(new ListTablesCommand({}));
  const existingNames = new Set(existing.TableNames ?? []);

  for (const table of tables) {
    if (existingNames.has(table.TableName)) {
      console.log(`skip  ${table.TableName} (already exists)`);
      continue;
    }
    await client.send(new CreateTableCommand(table));
    console.log(`create ${table.TableName}`);
  }

  // Native TTL on Sessions -- DynamoDB deletes expired items in the
  // background, same effect as Mongo's expireAfterSeconds index.
  try {
    await client.send(
      new (await import("@aws-sdk/client-dynamodb")).UpdateTimeToLiveCommand({
        TableName: "Sessions",
        TimeToLiveSpecification: { AttributeName: "ttl", Enabled: true },
      }),
    );
    console.log("enabled TTL on Sessions.ttl");
  } catch (err) {
    console.log(`(TTL setup skipped: ${err.message})`);
  }

  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
