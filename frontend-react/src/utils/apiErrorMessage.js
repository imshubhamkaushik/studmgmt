export const getApiErrorMessage = (error, fallback) => {
  if (!error) {
    return fallback;
  }

  switch (error.status) {
    case 400:
      return error.message || "The submitted data is invalid.";
    case 404:
      return error.message || "The requested resource was not found.";
    case 409:
      return error.message || "This record conflicts with an existing record.";
    case 0:
      return "Unable to connect to the server.";
    default:
      if (error.status >= 500) {
        return "The server encountered an unexpected problem.";
      }
      return error.message || fallback;
  }
};
