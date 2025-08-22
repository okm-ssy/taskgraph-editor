import { test, expect } from '@playwright/test';

test.describe('JSONパネル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('JSONパネルを開くことができる', async ({ page }) => {
    // JSONパネルが初期状態で閉じていることを確認
    const jsonPanel = page.locator('text=JSONデータ入力・出力').first();
    await expect(jsonPanel).toBeHidden();

    // JSONパネルを開くボタンをクリック
    const openButton = page.locator('button:has-text("JSONパネルを開く")');
    await expect(openButton).toBeVisible();
    await openButton.click();

    // JSONパネルが表示されることを確認
    await expect(jsonPanel).toBeVisible();

    // テキストエリアが表示されることを確認
    const textarea = page.locator('textarea[placeholder="ここにJSONデータを貼り付けてください"]');
    await expect(textarea).toBeVisible();

    // ボタンのテキストが変わることを確認
    const closeButton = page.locator('button:has-text("JSONパネルを閉じる")');
    await expect(closeButton).toBeVisible();
  });

  test('JSONパネルを閉じることができる', async ({ page }) => {
    // JSONパネルを開く
    await page.locator('button:has-text("JSONパネルを開く")').click();
    
    // JSONパネルが表示されることを確認
    const jsonPanel = page.locator('text=JSONデータ入力・出力').first();
    await expect(jsonPanel).toBeVisible();

    // JSONパネルを閉じるボタンをクリック
    await page.locator('button:has-text("JSONパネルを閉じる")').click();

    // JSONパネルが非表示になることを確認
    await expect(jsonPanel).toBeHidden();

    // ボタンのテキストが元に戻ることを確認
    const openButton = page.locator('button:has-text("JSONパネルを開く")');
    await expect(openButton).toBeVisible();
  });

  test('JSONデータを入力できる', async ({ page }) => {
    // JSONパネルを開く
    await page.locator('button:has-text("JSONパネルを開く")').click();

    // テキストエリアにJSONデータを入力
    const textarea = page.locator('textarea[placeholder="ここにJSONデータを貼り付けてください"]');
    const sampleJson = JSON.stringify({
      tasks: [],
      info: {
        name: 'Test Project',
        description: 'Test Description'
      }
    }, null, 2);
    
    await textarea.fill(sampleJson);

    // 入力した値が反映されていることを確認
    await expect(textarea).toHaveValue(sampleJson);
  });
});