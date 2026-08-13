document.addEventListener("DOMContentLoaded", () => {
  const studentForm = document.getElementById("studentForm");

  studentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addStud();
  });

  getStudents();
});

// GET all students
async function getStudents() {
  const studentsList = document.getElementById("students");

  try {
    const response = await fetch("/students");

    if (!response.ok) {
      throw new Error(`Failed to fetch students (${response.status})`);
    }

    const students = await response.json();

    studentsList.replaceChildren();

    if (students.length === 0) {
      const emptyMessage = document.createElement("li");

      emptyMessage.className = "list-group-item text-muted";
      emptyMessage.textContent = "No students found.";

      studentsList.appendChild(emptyMessage);

      return;
    }

    students.forEach((student) => {
      const listItem = document.createElement("li");

      listItem.className =
        "studentItem list-group-item d-flex justify-content-between align-items-center";

      const studentInfo = document.createElement("span");

      studentInfo.textContent =
        `${student.name}, ` +
        `Roll number: ${student.rollNo}, ` +
        `Class: ${student.sClass}, ` +
        `Date Of Birth: ${formatDate(student.dob)}`;

      const deleteButton = document.createElement("button");

      deleteButton.type = "button";
      deleteButton.className = "btn btn-danger btn-sm";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", () => {
        deleteStud(student._id);
      });

      listItem.appendChild(studentInfo);
      listItem.appendChild(deleteButton);

      studentsList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error fetching students:", error);

    studentsList.replaceChildren();

    const errorMessage = document.createElement("li");

    errorMessage.className = "list-group-item list-group-item-danger";
    errorMessage.textContent = "Unable to load students. Please try again.";

    studentsList.appendChild(errorMessage);
  }
}

// POST - Add student
async function addStud() {
  const nameInput = document.getElementById("name");
  const rollNoInput = document.getElementById("rollNo");
  const classInput = document.getElementById("class");
  const dobInput = document.getElementById("dob");

  const name = nameInput.value.trim();
  const rollNo = Number(rollNoInput.value);
  const sClass = classInput.value.trim();
  const dob = dobInput.value;

  if (!name || !Number.isInteger(rollNo) || rollNo <= 0 || !sClass || !dob) {
    alert("Please enter valid values in all fields.");
    return;
  }

  try {
    const response = await fetch("/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        rollNo,
        sClass,
        dob,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add student");
    }

    clearForm();

    await getStudents();
  } catch (error) {
    console.error("Error adding student:", error);

    alert(error.message);
  }
}

// DELETE - Delete student
async function deleteStud(studId) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this student?",
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/students/${studId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      let message = "Failed to delete student";

      try {
        const data = await response.json();

        if (data.message) {
          message = data.message;
        }
      } catch {
        // 204/empty responses do not contain JSON
      }

      throw new Error(message);
    }

    await getStudents();
  } catch (error) {
    console.error("Error deleting student:", error);

    alert(error.message);
  }
}

// Clear form
function clearForm() {
  document.getElementById("studentForm").reset();
}

// Format date
function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString();
}
