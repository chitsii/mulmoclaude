// Top-bar "today's journal" shortcut button (#876).
//
// The button calls GET /api/journal/latest-daily and:
//   - on { path, isoDate } → navigates to /files/<path> (FilesView
//     opens the markdown).
//   - on null              → fires window.alert with the
//     "no journal yet" copy.
//
// Live filesystem behaviour is covered by test/journal/test_latestDaily.ts.
// This spec only covers the UI wiring.

import { test, expect } from "@playwright/test";
import { mockAllApis } from "../fixtures/api";

test.describe("today-journal-btn — top bar shortcut", () => {
  test("navigates to FilesView when latest-daily returns a path", async ({ page }) => {
    await mockAllApis(page);
    await page.route(
      (url) => url.pathname === "/api/journal/latest-daily",
      (route) =>
        route.fulfill({
          json: {
            path: "conversations/summaries/daily/2026/04/26.md",
            isoDate: "2026-04-26",
          },
        }),
    );

    await page.goto("/chat");
    const btn = page.getByTestId("today-journal-btn");
    await expect(btn).toBeVisible();

    await btn.click();
    await page.waitForURL(/\/files\/conversations\/summaries\/daily\/2026\/04\/26\.md/);
  });

  test("shows an alert when latest-daily returns null", async ({ page }) => {
    await mockAllApis(page);
    await page.route(
      (url) => url.pathname === "/api/journal/latest-daily",
      (route) => route.fulfill({ json: null }),
    );

    // Capture the alert text — Playwright auto-dismisses dialogs only
    // when a handler is attached, otherwise the test hangs on the
    // first alert.
    let alertMessage: string | null = null;
    page.on("dialog", async (dialog) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.goto("/chat");
    const startUrl = page.url();
    await page.getByTestId("today-journal-btn").click();

    await expect.poll(() => alertMessage).not.toBeNull();
    expect(alertMessage).toMatch(/journal/i);
    // Must NOT have navigated.
    expect(page.url()).toBe(startUrl);
  });
});
