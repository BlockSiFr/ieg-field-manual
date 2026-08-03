import { describe, it, expect } from "vitest";
import { leadSchema } from "../../src/lib/validation";

describe("leadSchema", () => {
  it("requires consent", () => {
    const r = leadSchema.safeParse({
      firstName: "A",
      lastName: "B",
      workEmail: "a@example.com",
      organization: "Org",
      role: "Engineer",
      consent: false,
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid lead", () => {
    const r = leadSchema.safeParse({
      firstName: "A",
      lastName: "B",
      workEmail: "a@example.com",
      organization: "Org",
      role: "Engineer",
      consent: true,
    });
    expect(r.success).toBe(true);
  });
});
