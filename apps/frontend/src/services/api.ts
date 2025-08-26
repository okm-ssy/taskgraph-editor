import { IS_READONLY_MODE } from '@/constants/environment';

/**
 * APIサービスクラス
 * すべてのAPI呼び出しを一元管理
 */
class ApiService {
  /**
   * READONLY_MODEチェック付きfetchラッパー
   */
  private async request<T = unknown>(
    url: string,
    options?: RequestInit,
  ): Promise<T | null> {
    // GitHub PagesまたはREADONLYモードではnullを返す
    if (IS_READONLY_MODE) {
      console.log(`APIリクエストをスキップしました (READONLY_MODE): ${url}`);
      return null;
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return (await response.text()) as T;
      }
    } catch (error) {
      console.error(`APIリクエストエラー: ${url}`, error);
      throw error;
    }
  }

  /**
   * GETリクエスト
   */
  async get<T = unknown>(url: string): Promise<T | null> {
    return this.request<T>(url, {
      method: 'GET',
    });
  }

  /**
   * POSTリクエスト
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    headers?: HeadersInit,
  ): Promise<T | null> {
    return this.request<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  // === Taskgraph API ===

  /**
   * タスクグラフを保存
   */
  async saveTaskgraph(projectId: string, jsonData: string): Promise<boolean> {
    if (IS_READONLY_MODE) return true; // READONLYモードでは成功として扱う

    const url = `/api/save-taskgraph?projectId=${encodeURIComponent(projectId)}`;
    const result = await this.post(url, jsonData);
    return result !== null;
  }

  /**
   * タスクグラフを読み込み
   */
  async loadTaskgraph(projectId?: string): Promise<string | null> {
    // GitHub PagesまたはREADONLYモードではnullを返す
    if (IS_READONLY_MODE) {
      return null;
    }

    const url = projectId
      ? `/api/load-taskgraph?projectId=${encodeURIComponent(projectId)}`
      : '/api/load-taskgraph';

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // タスクグラフは常にJSON文字列として返す
      return await response.text();
    } catch (error) {
      console.error(`APIリクエストエラー: ${url}`, error);
      throw error;
    }
  }

  /**
   * タスクグラフの最終更新時刻を取得
   */
  async getTaskgraphMtime(projectId?: string): Promise<string | null> {
    if (IS_READONLY_MODE) return null;

    const url = projectId
      ? `/api/taskgraph-mtime?projectId=${encodeURIComponent(projectId)}`
      : '/api/taskgraph-mtime';

    const data = await this.get<{ exists: boolean; mtime: string }>(url);
    return data?.exists ? data.mtime : null;
  }

  /**
   * バックアップを作成
   */
  async createBackup(projectId?: string): Promise<boolean> {
    if (IS_READONLY_MODE) return true;

    const url = projectId
      ? `/api/backup-taskgraph?projectId=${encodeURIComponent(projectId)}`
      : '/api/backup-taskgraph';

    const data = await this.get<{ created: boolean }>(url);
    return data?.created || false;
  }

  // === Project API ===

  /**
   * プロジェクト一覧を取得
   */
  async fetchProjects(): Promise<Array<{ id: string; name: string }>> {
    if (IS_READONLY_MODE) return [];

    const projects =
      await this.get<Array<{ id: string; name: string }>>('/api/projects');
    return projects || [];
  }
}

// シングルトンインスタンスをエクスポート
export const apiService = new ApiService();
