import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { hasTestUser, logIn } from "./helpers";

async function expectNoViolations(page: Page, label: string) {
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await page.waitForTimeout(300); // let color transitions finish
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`);
    expect(summary, `${label} in ${theme} mode`).toEqual([]);
  }
}

for (const path of ["/", "/login", "/signup", "/forgot-password", "/privacy"]) {
  test(`no accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.locator("main").first().waitFor();
    await expectNoViolations(page, path);
  });
}

test.describe("signed-in pages", () => {
  test.skip(!hasTestUser, "Set TEST_USER_A_EMAIL and TEST_USER_A_PASSWORD in .env.local");

  for (const path of ["/contacts", "/calls", "/account"]) {
    test(`no accessibility violations on ${path}`, async ({ page }) => {
      await logIn(page, path);
      await page.waitForLoadState("networkidle");
      await expectNoViolations(page, path);
    });
  }
});
