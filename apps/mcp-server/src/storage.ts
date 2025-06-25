import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Taskgraph, TaskgraphSchema } from './types.js';

/**
 * LocalStorageとの連携を行うストレージマネージャー
 * フロントエンドが定期的にエクスポートするJSONファイルを読み書きする
 */
export class TaskgraphStorage {
  private dataPath: string;

  constructor() {
    // ユーザーのホームディレクトリに.taskgraphフォルダを作成
    const configDir = path.join(os.homedir(), '.taskgraph');
    this.dataPath = path.join(configDir, 'taskgraph-data.json');
  }

  async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.dataPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error('Failed to create directory:', error);
    }
  }

  async readTaskgraph(): Promise<Taskgraph | null> {
    try {
      await this.ensureDirectory();
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      return TaskgraphSchema.parse(parsed);
    } catch (error) {
      // ファイルが存在しない場合は空のタスクグラフを返す
      return {
        info: {},
        tasks: []
      };
    }
  }

  async writeTaskgraph(taskgraph: Taskgraph): Promise<void> {
    try {
      await this.ensureDirectory();
      const data = JSON.stringify(taskgraph, null, 2);
      await fs.writeFile(this.dataPath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to write taskgraph:', error);
      throw error;
    }
  }

  async updateTaskgraph(updater: (taskgraph: Taskgraph) => Taskgraph): Promise<Taskgraph> {
    const current = await this.readTaskgraph() || { info: {}, tasks: [] };
    const updated = updater(current);
    await this.writeTaskgraph(updated);
    return updated;
  }
}