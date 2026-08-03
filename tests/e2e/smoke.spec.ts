import { test, expect } from "@playwright/test";

test("homepage hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DASTOR" })).toBeVisible();
  await expect(page.getByText("AI systems do not fail loudly")).toBeVisible();
});

test("chapters filter page loads", async ({ page }) => {
  await page.goto("/chapters");
  await expect(page.getByRole("heading", { name: "Chapter directory" })).toBeVisible();
});

test("sample form validation", async ({ page }) => {
  await page.goto("/sample");
  await page.getByRole("button", { name: /Send me Chapter 1/i }).click();
  // native required fields should block empty submit
  await expect(page.locator('input[name="firstName"]')).toBeVisible();
});
