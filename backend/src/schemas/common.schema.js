import mongoose from "mongoose";
import { z } from "zod";

// Matches the same check validate-object-id.middleware.js already uses for
// :id route params, so a body-level reference field is held to the same
// standard as a path-level one.
export const objectId = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), {
    message: "must be a valid ID.",
  });

export const optionalObjectId = objectId.optional();

// Accepts a Date, an ISO string, or a plain "YYYY-MM-DD"/date-parsable
// string — mirrors what `new Date(value)` already accepted throughout the
// service layer, just rejecting it earlier with a clearer message.
export const dateLike = z.coerce.date({
  errorMap: () => ({ message: "must be a valid date." }),
});
