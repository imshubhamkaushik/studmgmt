import { useLocation } from "react-router-dom";

const getPageTitle = (pathname) => {
  if (pathname === "/dashboard") {
    return {
      title: "Dashboard",
      description: "Overview of your student records.",
    };
  }

  if (pathname === "/students") {
    return {
      title: "Students",
      description: "Manage and organize student records.",
    };
  }

  if (pathname === "/students/new") {
    return {
      title: "Add Student",
      description: "Create a new student record.",
    };
  }

  if (pathname.endsWith("/edit")) {
    return {
      title: "Edit Student",
      description: "Update an existing student record.",
    };
  }

  if (pathname.startsWith("/students/")) {
    return {
      title: "Student Details",
      description: "View student information.",
    };
  }

  return {
    title: "Student Management",
    description: "",
  };
};

export default function Header() {
  const location = useLocation();

  const { title, description } = getPageTitle(location.pathname);

  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>

        {description && <p>{description}</p>}
      </div>
    </header>
  );
}
