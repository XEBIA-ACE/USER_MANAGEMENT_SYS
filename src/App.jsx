import React from "react";
import RegistrationForm from "./components/RegistrationForm";
import "./App.css";

/**
 * App
 *
 * Root component. Renders the RegistrationForm and wires up the
 * onSubmit handler that calls the registration API.
 *
 * TODO: Replace the placeholder API call below with the real
 *       backend endpoint once the backend task (US-001 task 2) is complete.
 */

async function registerUser(formData) {
  // TODO: replace with actual API base URL / service layer
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    // Surface field-level errors (e.g. duplicate email) back to the form
    const err = new Error(errorBody.message || "Registration failed.");
    err.field = errorBody.field || null;
    throw err;
  }

  return response.json();
}

export default function App() {
  return (
    <div className="app">
      <RegistrationForm onSubmit={registerUser} />
    </div>
  );
}
