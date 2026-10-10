import { expect, test } from "@playwright/test";
import { hasTestUser, logIn } from "./helpers";

test("logged-out visitors are sent to log in, then back where they were", async ({ page }) => {
  await page.goto("/calls");
  await expect(page).toHaveURL(/\/login\?next=%2Fcalls$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test.describe("signed in", () => {
  test.skip(!hasTestUser, "Set TEST_USER_A_EMAIL and TEST_USER_A_PASSWORD in .env.local");

  test("add a contact, see it saved after reload, then delete it", async ({ page }) => {
    const name = `E2E Person ${Date.now()}`;
    await logIn(page, "/calls");
    await page.getByRole("link", { name: "Contacts" }).click();
    await expect(page).toHaveURL(/\/contacts$/);

    const addButton = page.getByRole("button", { name: /Add (your first )?contact/ }).first();
    await addButton.click();
    await page.keyboard.type("Playwright Partners");
    await page.keyboard.press("Tab");
    await page.keyboard.type(name);
    await page.keyboard.press("Tab");
    await page.keyboard.type("Analyst");
    await page.getByLabel(`Stage for ${name}`).selectOption("call_scheduled");
    await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page.getByLabel(`Name for ${name}`)).toHaveValue(name);
    await expect(page.getByLabel(`Title for ${name}`)).toHaveValue("Analyst");
    await expect(page.getByLabel(`Stage for ${name}`)).toHaveValue("call_scheduled");

    // They now wait in "Ready to schedule" on the calendar.
    await page.getByRole("link", { name: "Call Schedule" }).click();
    await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toBeVisible();

    await page.getByRole("link", { name: "Contacts" }).click();
    await page.getByRole("button", { name: `Actions for ${name}` }).click();
    await page.getByRole("menuitem", { name: "Delete contact" }).click();
    await expect(page.getByText(`Deleted ${name}.`)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(`Name for ${name}`)).toHaveCount(0);
  });
});
