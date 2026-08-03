import { describe, it, expect } from "vitest";
import { extractUtm } from "../../src/lib/utm";

describe("extractUtm", () => {
  it("parses utm params", () => {
    const u = extractUtm("?utm_source=li&utm_medium=social&utm_campaign=launch");
    expect(u.utm_source).toBe("li");
    expect(u.utm_medium).toBe("social");
    expect(u.utm_campaign).toBe("launch");
  });
});
