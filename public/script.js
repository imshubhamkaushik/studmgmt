document.addEventListener("DOMContentLoaded", () => {
  getStudents();
});

function getStudents() {
  fetch("/students")
    .then((response) => response.json())
    .then((students) => {
      const studentsList = document.getElementById("students");
      studentsList.innerHTML = "";

      students.forEach((student) => {
        const listItem = document.createElement("li");
        listItem.className = "studentItem";
        listItem.innerHTML = `${student.name}, Roll number: ${student.rollNo}, Class: ${student.class}, Date Of Birth: ${student.dob} <button onclick="deleteStud('${student._id}')">Delete</button>`;
        studentsList.appendChild(listItem);
      });
    })
    .catch((err) => {
      console.error("Error: ", err);
    });
}

function addStud() {
  const name = document.getElementById("name").value;
  const rollNo = document.getElementById("rollNo").value;
  const sClass = document.getElementById("class").value;
  const dob = document.getElementById("dob").value;

  fetch("/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      rollNo,
      class: sClass,
      dob,
    }),
  })
    .then((response) => response.json())
    .then(() => {
      getStudents();
      clearForm();
    })
    .catch((error) => alert(`Error: ${error}`));
}

function deleteStud(studId) {
  fetch(`/students/${studId}`, { method: "DELETE" })
    .then(() => {
      getStudents();
    })
    .catch((error) => console.log("Error: ", error));
}

function clearForm() {
  document.getElementById("addStudentForm").reset();
  //document.getElementById('name').value = '';
  //document.getElementById('rollNo').value = '';
  //document.getElementById('class').value = '';
  //document.getElementById('dob').value = '';
}
