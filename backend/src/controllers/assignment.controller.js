import { S3Client } from "@aws-sdk/client-s3";
import * as service from "../services/assignment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const s3Client = new S3Client({});
const awsClients = () => ({ s3Client, bucket: process.env.ASSIGNMENTS_BUCKET });

export const list = asyncHandler(async (req, res) =>
  res.json({ success: true, data: await service.listAssignments(req.query, req.user) }),
);

export const create = asyncHandler(async (req, res) =>
  res.status(201).json({
    success: true,
    data: await service.createAssignment(req.body, req.file, req.user, req.requestId, awsClients()),
  }),
);

export const update = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.updateAssignment(req.params.id, req.body, req.user, req.requestId),
  }),
);

export const downloadAttachment = asyncHandler(async (req, res) => {
  const { redirectUrl } = await service.getAssignmentAttachmentPath(req.params.id, req.user, awsClients());
  res.redirect(302, redirectUrl);
});
