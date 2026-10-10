import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { hasTestUser, logIn } from "./helpers";

test.skip(!hasTestUser, "Set TEST_USER_A_EMAIL and TEST_USER_A_PASSWORD in .env.local");

async function addContact(page: Page, name: string, company: string) {
  await page.getByRole("button", { name: /Add (your first )?contact/ }).first().click();
  await page.keyboard.type(company);
  await page.keyboard.press("Tab");
  await page.keyboard.type(name);
  await page.keyboard.press("Tab");
  await page.keyboard.type("Analyst");
  await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 10_000 });
}

async function deleteContact(page: Page, name: string) {
  await page.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Delete contact" }).click();
  await expect(page.getByText(`Deleted ${name}.`)).toBeVisible();
}

test("notes panel: write prep, call notes and a thank-you, then reopen after reload", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const name = `Notes Person ${Date.now()}`;
  await logIn(page);
  await addContact(page, name, "Halcyon Partners");

  // The Notes cell is a preview plus a button, not an editable input.
  await expect(page.getByLabel(`Notes for ${name}`, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: `Open notes for ${name}` }).click();
  const panel = page.getByRole("dialog", { name });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Halcyon Partners · Analyst")).toBeVisible();
  for (const heading of ["Prep", "Call notes", "Follow-up"]) {
    await expect(panel.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await expect(panel.getByText("Why Halcyon Partners?")).toBeVisible();

  // Desktop: the panel takes the right half and the table is still visible on the left.
  const box = (await panel.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(box.x - viewport.width / 2)).toBeLessThan(2);
  await expect(page.getByLabel(`Name for ${name}`)).toBeInViewport();

  // Everything starts empty with placeholders.
  await expect(panel.getByLabel("Question 1")).toHaveValue("");
  await expect(panel.getByLabel("Question 1")).toHaveAttribute("placeholder", "Add a question");
  await expect(panel.getByLabel("Body")).toHaveAttribute("placeholder", "Write your thank-you email");

  await panel.getByLabel("Email (optional)").fill("nadia@example.com");

  // Numbered list: Enter adds the next number; Backspace on an empty item removes it.
  await panel.getByLabel("Question 1").click();
  await page.keyboard.type("How did you recruit from a non-target school, and what would you do differently?");
  await page.keyboard.press("Enter");
  await expect(panel.getByLabel("Question 2")).toBeFocused();
  await page.keyboard.type("What does a typical week look like?");
  await page.keyboard.press("Enter");
  await expect(panel.getByLabel("Question 3")).toBeFocused();
  await page.keyboard.press("Backspace");
  await expect(panel.getByLabel("Question 3")).toHaveCount(0);
  await expect(panel.getByLabel("Question 2")).toBeFocused();

  // Long questions wrap inside their item (hanging indent) instead of scrolling sideways.
  const q1 = panel.getByLabel("Question 1");
  const q1Height = await q1.evaluate((el) => el.getBoundingClientRect().height);
  const q2Height = await panel.getByLabel("Question 2").evaluate((el) => el.getBoundingClientRect().height);
  expect(q1Height).toBeGreaterThanOrEqual(q2Height);

  await panel.getByLabel("Advice 1").fill("Know the three statements cold");
  await panel.getByLabel("Subject").fill("Thank you, Nadia");
  await panel.getByLabel("Body").fill("Hi Nadia,\nThanks for your time today.");

  await panel.getByRole("button", { name: "Copy" }).click();
  await expect(panel.getByText("Copied subject and body.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Subject: Thank you, Nadia\n\nHi Nadia,\nThanks for your time today.",
  );
  await expect(panel.getByRole("link", { name: "Open in email" })).toHaveAttribute(
    "href",
    "mailto:nadia@example.com?subject=Thank%20you%2C%20Nadia&body=Hi%20Nadia%2C%0D%0AThanks%20for%20your%20time%20today.",
  );

  await panel.getByLabel("Thank-you sent").check();
  await expect(panel.getByText(/· \w{3} \d{1,2}, \d{4}/)).toBeVisible();
  await expect(panel.getByText("All changes saved")).toBeVisible({ timeout: 10_000 });

  // Accessibility with the panel open, in both themes.
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`), theme).toEqual([]);
  }
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));

  // Escape closes the panel and puts focus back on the button.
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Open notes for ${name}` })).toBeFocused();

  // The grid shows a preview, and everything is still there after a reload.
  const row = page.locator("tr", { has: page.getByLabel(`Name for ${name}`) });
  await expect(row.getByText(/^Key advice: Know the three statements cold/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: `Open notes for ${name}` }).click();
  await expect(panel.getByLabel("Email (optional)")).toHaveValue("nadia@example.com");
  await expect(panel.getByLabel("Question 1")).toHaveValue(/^How did you recruit/);
  await expect(panel.getByLabel("Question 2")).toHaveValue("What does a typical week look like?");
  await expect(panel.getByLabel("Advice 1")).toHaveValue("Know the three statements cold");
  await expect(panel.getByLabel("Thank-you sent")).toBeChecked();
  await panel.getByRole("button", { name: "Close notes" }).click();
  await expect(panel).toHaveCount(0);

  await deleteContact(page, name);
});

test("notes panel is a full-screen sheet on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const name = `Phone Notes ${Date.now()}`;
  await logIn(page);
  await addContact(page, name, "Kestrel Securities");
  await page.getByRole("button", { name: `Open notes for ${name}` }).click();
  const panel = page.getByRole("dialog", { name });
  const box = (await panel.boundingBox())!;
  expect(box).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await panel.getByLabel("Background note 1").fill("Moved from consulting");
  await expect(panel.getByText("All changes saved")).toBeVisible({ timeout: 10_000 });
  await panel.getByRole("button", { name: "Close notes" }).click();
  await deleteContact(page, name);
});
