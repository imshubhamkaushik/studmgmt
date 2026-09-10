import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Every file this app stores now lives in S3, reached one of two ways:
//   1. The client uploads directly to S3 via a presigned POST (see
//      assignment-submission.service.js's requestSubmissionUploadUrlFor*)
//      — used when the browser already has the file and there's no
//      reason to proxy the bytes through this Node process at all.
//   2. The backend already received the file as part of a same-request
//      multipart form (a teacher attaching reference material, staff
//      recording a submission on a student's behalf, a generated report
//      card PDF) — those flows use uploadBufferToS3 below to forward the
//      already-received buffer straight to S3 with no local disk step in
//      between.
// Both paths converge on the same storage: nothing is ever written to
// the container's local filesystem, so there's no PersistentVolume to
// provision or keep in sync across replicas.
// Never trust a client-supplied filename as part of an S3 key directly —
// strip it down to a safe character set first. The original name is still
// preserved separately (as `originalName` on the document) for display.
export const sanitizeFilename = (name) => String(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);

export async function uploadBufferToS3({ s3Client, bucket, key, buffer, contentType }) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    }),
  );
  return key;
}

export async function getS3DownloadUrl({ s3Client, bucket, key, expiresIn = 300 }) {
  return getSignedUrl(s3Client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}
