import { Page, Locator, expect } from '@playwright/test';

export class ConfigPage {
    readonly page: Page;
    readonly saveButton: Locator;
    readonly successAlert: Locator;

    constructor(page: Page) {
        this.page = page;
        this.saveButton = page.getByRole('button', { name: 'Save Changes' });
        this.successAlert = page.locator('.alert-success');
    }

    async navigateToConfig() {
        await this.page.goto('/admin/configuration');
        await this.page.waitForLoadState('networkidle');
    }

    async selectConfigTab(tabName: string) {
        // The tabs might be capitalized in the UI, or just as they are keys. 
        // The code says: key.charAt(0).toUpperCase() + key.slice(1)
        // So 'llm' -> 'Llm' or 'LLM' depending on how it's stored.
        // Let's try case-insensitive text match or specific locator.
        // The keys are likely 'llmConfig', 'discordConfig' etc, or just 'llm'.
        // In ComprehensiveConfigPanel: activeTab maps to keys of the global config object.
        // I suspect the keys are 'llm', 'discord', etc.
        const tabLabel = tabName.charAt(0).toUpperCase() + tabName.slice(1);
        await this.page.locator('.tab').filter({ hasText: tabLabel }).first().click();
    }

    async getValues() {
        // Helper to return current input values for verification?
        // Maybe not needed for simple tests.
    }

    async updateText(label: string, value: string) {
        // Label structure: <label><span class="label-text">KEY</span>...</label><input>
        const input = this.page.getByLabel(label, { exact: true });
        await input.fill(value);
    }

    async updateNumber(label: string, value: number) {
        const input = this.page.getByLabel(label, { exact: true });
        await input.fill(value.toString());
    }

    async toggleSwitch(label: string, shouldBeChecked: boolean) {
        // The toggle is inside a label with the text.
        // <label><span>Text</span><input type="checkbox" ...></label>
        // getByLabel might work if the label text is associated with the input.
        // In DaisyUI code:
        // <label ...>
        //   <span ...>{key}</span>
        //   <Toggle ... />
        // </label>
        // The input is inside the label, so clicking the label toggles it, or getByLabel(key) should work if there is an association or implicit association.
        // However, with nested inputs, getByLabel often works.

        // Check current state
        const input = this.page.getByLabel(label, { exact: true });
        const isChecked = await input.isChecked();
        if (isChecked !== shouldBeChecked) {
            await input.click(); // Click to toggle
        }
    }

    async updateArray(label: string, items: string[]) {
        // Comma separated string input
        const input = this.page.getByLabel(label, { exact: true });
        await input.fill(items.join(', '));
    }

    async updateJSON(label: string, jsonObject: object) {
        // The JSON editor is a Textarea.
        // Label matches the key.
        const textarea = this.page.getByLabel(label, { exact: true });
        await textarea.fill(JSON.stringify(jsonObject, null, 2));
    }

    async saveChanges() {
        await this.saveButton.click();
    }

    async getSuccessMessage() {
        await expect(this.successAlert).toBeVisible();
        return await this.successAlert.innerText();
    }
}
