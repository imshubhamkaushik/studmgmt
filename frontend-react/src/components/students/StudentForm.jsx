import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { studentSchema } from "../../schemas/student.schema";
import Button from "../common/Button";
import { getTodayDateInputValue } from "../../utils/date";

const DEFAULT_VALUES = {
  name: "",
  rollNo: "",
  class: "",
  section: "",
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
      <fieldset className="student-form-fields" disabled={isSubmitting}>
        <legend className="sr-only">Student information</legend>
        <div className="form-grid">
        <div className="form-field">
          <label htmlFor="name">Full Name</label>

          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Enter student's full name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            aria-required="true"
            {...register("name")}
          />

          {errors.name && (
            <p id="name-error" className="field-error" role="alert">
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
            aria-describedby={errors.rollNo ? "rollNo-error" : undefined}
            aria-required="true"
            inputMode="numeric"
            {...register("rollNo")}
          />

          {errors.rollNo && (
            <p id="rollNo-error" className="field-error" role="alert">
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
            aria-describedby={errors.class ? "class-error" : undefined}
            aria-required="true"
            {...register("class")}
          />

          {errors.class && (
            <p id="class-error" className="field-error" role="alert">
              {errors.class.message}
            </p>
          )}
        </div>


        <div className="form-field">
          <label htmlFor="section">Section</label>
          <input id="section" type="text" placeholder="For example: A" aria-invalid={Boolean(errors.section)} aria-describedby={errors.section ? "section-error" : undefined} aria-required="true" {...register("section")} />
          {errors.section && (<p id="section-error" className="field-error" role="alert">{errors.section.message}</p>)}
        </div>

        <div className="form-field">
          <label htmlFor="dob">Date of Birth</label>

          <input
            id="dob"
            type="date"
            max={getTodayDateInputValue()}
            aria-invalid={Boolean(errors.dob)}
            aria-describedby={errors.dob ? "dob-error" : undefined}
            aria-required="true"
            {...register("dob")}
          />

          {errors.dob && (
            <p id="dob-error" className="field-error" role="alert">
              {errors.dob.message}
            </p>
          )}
        </div>
        </div>
      </fieldset>

      <div className="form-actions">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
