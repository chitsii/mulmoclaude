import { test, expect, type Page } from "@playwright/test";
import { mockAllApis } from "../fixtures/api";

// Mount a session where the sidebar holds a presentSpreadsheet tool
// result. The spreadsheet View.vue renders when the user clicks the
// sidebar entry, so asserting against the rendered table exercises
// both the file-backed fetchSheets path and the table render.

interface SpreadsheetResultOptions {
  // Stored file path ("spreadsheets/abc.json") or inline sheets array.
  sheets: string | unknown[];
  sessionId?: string;
}

async function setupSpreadsheetSession(
  page: Page,
  opts: SpreadsheetResultOptions,
) {
  const sessionId = opts.sessionId ?? "sheet-session";
  await mockAllApis(page, {
    sessions: [
      {
        id: sessionId,
        title: "Spreadsheet Session",
        roleId: "general",
        startedAt: "2026-04-13T10:00:00Z",
        updatedAt: "2026-04-13T10:05:00Z",
      },
    ],
  });

  await page.route(
    (url) =>
      url.pathname.startsWith("/api/sessions/") &&
      url.pathname !== "/api/sessions",
    (route) =>
      route.fulfill({
        json: [
          { type: "session_meta", roleId: "general", sessionId },
          { type: "text", source: "user", message: "Make a sheet" },
          {
            type: "tool_result",
            source: "tool",
            result: {
              uuid: "sheet-result-1",
              toolName: "presentSpreadsheet",
              message: "Spreadsheet created",
              title: "Test Sheet",
              data: { sheets: opts.sheets },
            },
          },
        ],
      }),
  );
}

// Mock /api/files/content for a given path + response body.
async function mockFileContent(
  page: Page,
  path: string,
  body: { kind?: string; content?: string; message?: string },
) {
  await page.route(
    (url) =>
      url.pathname === "/api/files/content" &&
      url.searchParams.get("path") === path,
    (route) => route.fulfill({ json: body }),
  );
}

test.describe("spreadsheet rendering", () => {
  test("file-backed spreadsheet renders cell values", async ({ page }) => {
    const path = "spreadsheets/abc.json";
    const sheets = [
      {
        name: "Sheet1",
        data: [
          [{ v: "Product" }, { v: "Sales" }],
          [{ v: "Apples" }, { v: 100 }],
          [{ v: "Bananas" }, { v: 200 }],
        ],
      },
    ];
    await setupSpreadsheetSession(page, { sheets: path });
    await mockFileContent(page, path, {
      kind: "text",
      content: JSON.stringify(sheets),
    });

    await page.goto("/chat/sheet-session");
    await expect(page.getByText("MulmoClaude")).toBeVisible();
    // Click the sidebar result to mount the View
    await page.waitForTimeout(500);
    await page.getByText("Test Sheet").first().click();
    // The table should render the cell values
    await expect(page.getByText("Apples").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Bananas").first()).toBeVisible();
  });

  test("too-large file shows an error message", async ({ page }) => {
    const path = "spreadsheets/huge.json";
    await setupSpreadsheetSession(page, { sheets: path });
    await mockFileContent(page, path, {
      kind: "too-large",
      message: "File exceeds size limit",
    });

    await page.goto("/chat/sheet-session");
    await expect(page.getByText("MulmoClaude")).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByText("Test Sheet").first().click();
    await expect(page.getByText("File exceeds size limit")).toBeVisible({
      timeout: 5000,
    });
  });

  test("malformed JSON shows a parse error message", async ({ page }) => {
    const path = "spreadsheets/broken.json";
    await setupSpreadsheetSession(page, { sheets: path });
    await mockFileContent(page, path, {
      kind: "text",
      content: "{not valid json",
    });

    await page.goto("/chat/sheet-session");
    await expect(page.getByText("MulmoClaude")).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByText("Test Sheet").first().click();
    await expect(page.getByText(/malformed/i)).toBeVisible({ timeout: 5000 });
  });

  test("non-array content shows a shape error message", async ({ page }) => {
    const path = "spreadsheets/wrong.json";
    await setupSpreadsheetSession(page, { sheets: path });
    await mockFileContent(page, path, {
      kind: "text",
      content: JSON.stringify({ name: "not an array" }),
    });

    await page.goto("/chat/sheet-session");
    await expect(page.getByText("MulmoClaude")).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByText("Test Sheet").first().click();
    await expect(page.getByText(/not an array/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("legacy inline sheets render without fetch", async ({ page }) => {
    const sheets = [
      {
        name: "Inline",
        data: [[{ v: "Legacy" }, { v: 1 }]],
      },
    ];
    await setupSpreadsheetSession(page, { sheets });
    // No mockFileContent — the View should render directly from inline data

    await page.goto("/chat/sheet-session");
    await expect(page.getByText("MulmoClaude")).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByText("Test Sheet").first().click();
    await expect(page.getByText("Legacy").first()).toBeVisible({
      timeout: 5000,
    });
  });
});
