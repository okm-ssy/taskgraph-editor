export interface Page {
  name: string;
  id: string;
}

export const viewerPage: Page = {
  name: 'ビューアー',
  id: 'viewer',
};

export const editorPage: Page = {
  name: 'エディター',
  id: 'editor',
};
