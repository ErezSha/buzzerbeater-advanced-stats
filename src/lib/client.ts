import { createBbapiClient, type BbapiClient } from "@/server/bbapi/client"; // Adjust path as needed

// Extend the global object to hold our client instance
const globalForBbapi = globalThis as unknown as {
  bbapiClient: BbapiClient | undefined;
};

// If an instance already exists on the global object, use it.
// Otherwise, create a new one.
export const bbapiClient = globalForBbapi.bbapiClient ?? createBbapiClient();

// In development, attach the newly created instance to the global object
// so it survives Hot Module Replacement (HMR).
if (process.env.NODE_ENV !== "production") {
  globalForBbapi.bbapiClient = bbapiClient;
}
