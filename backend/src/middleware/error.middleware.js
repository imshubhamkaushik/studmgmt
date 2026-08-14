export const errorHandler = (error, req, res, next) => {
  if (error?.name === "CastError") return res.status(400).json({ success:false, message:"Invalid resource ID." });
  if (error?.name === "ValidationError") {
    return res.status(400).json({ success:false, message:"Validation failed.", errors:Object.values(error.errors).map((item)=>item.message) });
  }
  if (error?.code === 11000) {
    const p=error.keyPattern||{}, v=error.keyValue||{};
    let message="A record with this value already exists.";
    if (p.studentId) message="Student ID already exists.";
    else if (p.admissionNo) message="Admission number already exists.";
    else if (p.class && p.section && p.rollNo) message=`Roll number ${v.rollNo} already exists in Class ${v.class}, Section ${v.section}.`;
    return res.status(409).json({success:false,message});
  }
  const statusCode=error?.statusCode || 500;
  if (statusCode>=500) console.error(JSON.stringify({level:"error",requestId:req?.requestId,statusCode,message:error?.message,stack:error?.stack}));
  return res.status(statusCode).json({ success:false, message:statusCode>=500?"Internal server error.":error.message, ...(req?.requestId?{requestId:req.requestId}:{}) });
};
