import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "@/lib/auth/errors";
import { checkPassword, isPasswordValid } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths, including query strings", () => {
    expect(safeNextPath("/calls")).toBe("/calls");
    expect(safeNextPath("/contacts?stage=called")).toBe("/contacts?stage=called");
    expect(safeNextPath(encodeURIComponent("/calls?week=2026-10-05"))).toBe("/calls?week=2026-10-05");
  });

  it("falls back to the app for missing or unsafe values", () => {
    expect(safeNextPath(null)).toBe("/contacts");
    expect(safeNextPath("")).toBe("/contacts");
    expect(safeNextPath("https://evil.example")).toBe("/contacts");
    expect(safeNextPath("//evil.example")).toBe("/contacts");
    expect(safeNextPath("/\\evil.example")).toBe("/contacts");
    expect(safeNextPath("%2F%2Fevil.example")).toBe("/contacts");
    expect(safeNextPath("/login")).toBe("/contacts");
    expect(safeNextPath("/auth/callback")).toBe("/contacts");
  });
});

describe("password rules", () => {
  it("requires 8+ characters with a letter and a number", () => {
    expect(isPasswordValid("short1")).toBe(false);
    expect(isPasswordValid("longenough")).toBe(false);
    expect(isPasswordValid("12345678")).toBe(false);
    expect(isPasswordValid("analyst2027")).toBe(true);
  });

  it("reports each rule separately for the inline checklist", () => {
    const result = checkPassword("abc");
    expect(result.map((r) => [r.id, r.passed])).toEqual([
      ["length", false],
      ["letter", true],
      ["number", false],
    ]);
  });
});

describe("friendlyAuthError", () => {
  it("maps Supabase error codes to plain sentences", () => {
    expect(friendlyAuthError({ code: "invalid_credentials" })).toMatch(/don't match/);
    expect(friendlyAuthError({ code: "email_not_confirmed" })).toMatch(/confirm your email/);
    expect(friendlyAuthError({ code: "user_already_exists" })).toMatch(/already exists/);
  });

  it("falls back to message text, then a generic message", () => {
    expect(friendlyAuthError({ message: "Invalid login credentials" })).toMatch(/don't match/);
    expect(friendlyAuthError({ message: "TypeError: Failed to fetch" })).toMatch(/connection/);
    expect(friendlyAuthError({ message: "weird" })).toBe("Something went wrong. Please try again.");
    expect(friendlyAuthError(null)).toBe("Something went wrong. Please try again.");
  });
});
