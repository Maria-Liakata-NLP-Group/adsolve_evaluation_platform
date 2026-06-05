/** @format */

// Converts a human-readable label into a lowercase underscore slug for use as an ID.
export const toSlug = (label) =>
  label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
