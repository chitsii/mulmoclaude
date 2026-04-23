// E2E regression guard for the clickable-region a11y contract added
// in #684: non-<button> elements with @click= handlers must be
// keyboard-activatable via Enter / Space.
//
// Scoped to one representative site (the /history session-row div)
// to keep the suite cheap. The same contract is applied to four
// other sites (todo list/table/kanban); those share the code path
// and are covered by manual verification.

import { test, expect } from "@playwright/test";
import { mockAllApis } from "../fixtures/api";
import { SESSION_A } from "../fixtures/sessions";

test.describe("clickable-region a11y", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
  });

  test("Enter on a focused /history session row loads the session", async ({ page }) => {
    await page.goto("/history");
    const row = page.getByTestId(`session-item-${SESSION_A.id}`);
    await expect(row).toBeVisible();

    // Programmatic focus (matching what keyboard users land on after
    // Tab-walking past the filter pills).
    await row.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(new RegExp(`/chat/${SESSION_A.id}`));
  });

  test("Space on a focused /history session row loads the session", async ({ page }) => {
    await page.goto("/history");
    const row = page.getByTestId(`session-item-${SESSION_A.id}`);
    await expect(row).toBeVisible();

    await row.focus();
    await page.keyboard.press("Space");

    await expect(page).toHaveURL(new RegExp(`/chat/${SESSION_A.id}`));
  });

  test("/history session row advertises role=button and an aria-label", async ({ page }) => {
    await page.goto("/history");
    const row = page.getByTestId(`session-item-${SESSION_A.id}`);
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("role", "button");
    await expect(row).toHaveAttribute("tabindex", "0");
    // aria-label is interpolated from the session preview; content
    // may vary with locale / fixture, so only assert presence here.
    const label = await row.getAttribute("aria-label");
    expect(label).toBeTruthy();
  });
});
