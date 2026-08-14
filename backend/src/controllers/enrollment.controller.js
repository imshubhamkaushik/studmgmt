import * as service from "../services/enrollment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const list = asyncHandler(async (req,res)=>res.json({success:true,data:await service.listEnrollments(req.query, req.user)}));
export const create = asyncHandler(async (req,res)=>res.status(201).json({success:true,data:await service.enrollStudent(req.body,req.requestId)}));
export const promote = asyncHandler(async (req,res)=>res.status(201).json({success:true,data:await service.promoteStudents(req.body,req.requestId)}));
