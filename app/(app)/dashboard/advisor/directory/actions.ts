"use server";

// Re-export from clients/actions to avoid duplicate connection request logic.
// The clients version handles reactivation of removed/denied/expired connections.
export { sendAdvisorConnectionRequest } from "../clients/actions";
