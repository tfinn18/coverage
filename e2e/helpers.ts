import { expect, type Page } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

export const testUser = {
  email: process.env.TEST_USER_A_EMAIL ?? "",
  password: process.env.TEST_USER_A_PASSWORD ?? "",
};
export const hasTestUser = Boolean(testUser.email && testUser.password);

export async function logIn(page: Page, next = "/contacts") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(testUser.email);
  await page.getByLabel("Password").fill(testUser.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(new RegExp(`${next}$`));
}
