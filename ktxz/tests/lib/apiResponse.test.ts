import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/apiResponse";

describe("ApiError", () => {
  it("creates an error with default status 500", () => {
    const err = new ApiError("Something went wrong");
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBeUndefined();
  });

  it("creates an error with custom status code", () => {
    const err = new ApiError("Not found", 404);
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
  });

  it("creates an error with custom code", () => {
    const err = new ApiError("Unauthorized", 401, "AUTH_REQUIRED");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTH_REQUIRED");
  });

  it("extends Error", () => {
    const err = new ApiError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });
});
