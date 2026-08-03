import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("public chapter content", () => {
  const dir = join(process.cwd(), "src/content/chapters");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

  it("has 40 chapters", () => {
    expect(files.length).toBe(40);
  });

  it("keeps chapter 1 sample fields source-grounded", () => {
    const ch1 = JSON.parse(readFileSync(join(dir, "ai-is-not-software.json"), "utf8"));
    expect(ch1.title).toBe("AI Is Not Software");
    expect(ch1.publicExcerpt).toBe(true);
  });
});
