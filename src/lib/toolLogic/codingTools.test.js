import { describe, expect, it } from "vitest";
import {
  buildDockerfile,
  buildGitCommand,
  buildOpenApiSpec,
  compareTechnology,
  parseSqlSchemaToOrm,
  validateEnvFile
} from "./codingTools";

describe("coding tool helpers", () => {
  it("validates env files and catches duplicates", () => {
    const result = validateEnvFile("API_KEY=one\nAPI_KEY=two");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("duplicate");
  });

  it("builds deterministic dev templates", () => {
    expect(buildGitCommand("branch", { branch: "feature/test" })).toContain("feature/test");
    expect(buildDockerfile("node", "service", "server.js")).toContain("node:20-alpine");
    expect(buildOpenApiSpec({ title: "Demo API", version: "1.0.0", baseUrl: "https://api.example.com", endpoints: "GET /users List users" })).toContain("/users");
  });

  it("converts sql schemas and compares technology datasets", () => {
    expect(parseSqlSchemaToOrm("CREATE TABLE users (id INT, name VARCHAR(255))", "prisma")).toContain("model Users");
    expect(compareTechnology("language", ["javascript", "python"])).toHaveLength(2);
  });
});
