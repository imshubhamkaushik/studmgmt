import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

// A single, schema-driven place to validate request shape before it ever
// reaches a controller/service. Previously most routes had no request
// validation at all beyond whatever Mongoose happened to enforce at
// `.save()` time — which meant malformed input could travel deep into
// business logic before failing, often with a raw CastError/ValidationError
// instead of a clear, field-level message.
//
// Usage: router.post("/", validate({ body: createSchema }), controller)
// Each of body/params/query is optional; only the ones passed are checked.
// On success, req.<part> is replaced with the *parsed* value (so defaults
// and z.coerce conversions from the schema are applied downstream too).
export function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      if (body) req.body = body.parse(req.body ?? {});
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => {
          const path = issue.path.join(".");
          return path ? `${path}: ${issue.message}` : issue.message;
        });
        const appError = new AppError("Validation failed.", 400);
        appError.details = details;
        return next(appError);
      }
      return next(error);
    }
  };
}
