import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { studentSchema } from "../../schemas/student.schema";
import Button from "../common/Button";

const DEFAULT_VALUES = {
  name: "",
  rollNo: "",
  class: "",
  dob: "",
};

export default function StudentForm({
  initialValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save Student",
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...initialValues,
    },
  });

  useEffect(() => {
    reset({
      ...DEFAULT_VALUES,
      ...initialValues,
    });
  }, [initialValues, reset]);

  return (
    <form className="student-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="name">Full Name</label>

          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Enter student's full name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />

          {errors.name && (
            <p className="field-error" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="rollNo">Roll Number</label>

          <input
            id="rollNo"
            type="number"
            min="1"
            step="1"
            placeholder="Enter roll number"
            aria-invalid={Boolean(errors.rollNo)}
            {...register("rollNo")}
          />

          {errors.rollNo && (
            <p className="field-error" role="alert">
              {errors.rollNo.message}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="class">Class</label>

          <input
            id="class"
            type="text"
            placeholder="For example: 10"
            aria-invalid={Boolean(errors.class)}
            {...register("class")}
          />

          {errors.class && (
            <p className="field-error" role="alert">
              {errors.class.message}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="dob">Date of Birth</label>

          <input
            id="dob"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            aria-invalid={Boolean(errors.dob)}
            {...register("dob")}
          />

          {errors.dob && (
            <p className="field-error" role="alert">
              {errors.dob.message}
            </p>
          )}
        </div>
      </div>

      <div className="form-actions">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
