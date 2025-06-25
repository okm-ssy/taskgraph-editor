import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Taskgraph, TaskgraphSchema } from './types.js';

/**
 * LocalStorageとの連携を行うストレージマネージャー
 * フロントエンドが定期的にエクスポートするJSONファイルを読み書きする
 */
export class TaskgraphStorage {
  private dataDir: string;

  constructor() {
    // プロジェクトルートのdataフォルダ
    // ESモジュールでの__dirnameの代替
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.dataDir = path.join(__dirname, '..', '..', '..', 'data');
    console.error(`TaskgraphStorage: Data directory set to ${this.dataDir}`);
  }

  // プロジェクトIDからファイルパスを生成
  private getProjectFilePath(projectId: string): string {
    return path.join(this.dataDir, `${projectId}.taskgraph.json`);
  }

  async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create directory:', error);
    }
  }

  async readTaskgraph(projectId: string = 'default'): Promise<Taskgraph | null> {
    try {
      await this.ensureDirectory();
      const projectPath = this.getProjectFilePath(projectId);
      console.error(`TaskgraphStorage: Reading from ${projectPath}`);
      const data = await fs.readFile(projectPath, 'utf-8');
      const parsed = JSON.parse(data);
      const result = TaskgraphSchema.parse(parsed);
      console.error(`TaskgraphStorage: Successfully loaded ${result.tasks.length} tasks from ${projectId}`);
      return result;
    } catch (error) {
      // ファイルが存在しない場合は空のタスクグラフを返す
      console.error(`TaskgraphStorage: Error reading file for ${projectId} (${error}), returning empty taskgraph`);
      return {
        info: {},
        tasks: []
      };
    }
  }

  async writeTaskgraph(taskgraph: Taskgraph, projectId: string = 'default'): Promise<void> {
    try {
      await this.ensureDirectory();
      const projectPath = this.getProjectFilePath(projectId);
      const data = JSON.stringify(taskgraph, null, 2);
      await fs.writeFile(projectPath, data, 'utf-8');
      console.error(`TaskgraphStorage: Successfully wrote ${taskgraph.tasks.length} tasks to ${projectId}`);
    } catch (error) {
      console.error('Failed to write taskgraph:', error);
      throw error;
    }
  }

  async updateTaskgraph(updater: (taskgraph: Taskgraph) => Taskgraph, projectId: string = 'default'): Promise<Taskgraph> {
    const current = await this.readTaskgraph(projectId) || { info: {}, tasks: [] };
    const updated = updater(current);
    await this.writeTaskgraph(updated, projectId);
    return updated;
  }

  // プロジェクト一覧を取得
  async listProjects(): Promise<string[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.dataDir);
      const projects = files
        .filter(file => file.endsWith('.taskgraph.json'))
        .map(file => file.replace('.taskgraph.json', ''));
      return projects;
    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  }

  // 特定のタスクを取得
  async getTask(projectId: string, taskName: string) {
    const taskgraph = await this.readTaskgraph(projectId);
    if (!taskgraph) return null;
    return taskgraph.tasks.find(task => task.name === taskName) || null;
  }

  // タスクを更新
  async updateTask(projectId: string, taskName: string, taskData: any) {
    return await this.updateTaskgraph(taskgraph => {
      const taskIndex = taskgraph.tasks.findIndex(task => task.name === taskName);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskName} not found`);
      }
      taskgraph.tasks[taskIndex] = { ...taskgraph.tasks[taskIndex], ...taskData };
      return taskgraph;
    }, projectId);
  }

  // タスクを新規作成
  async createTask(projectId: string, taskData: any) {
    return await this.updateTaskgraph(taskgraph => {
      // 同名タスクの存在チェック
      if (taskgraph.tasks.some(task => task.name === taskData.name)) {
        throw new Error(`Task ${taskData.name} already exists`);
      }
      taskgraph.tasks.push(taskData);
      return taskgraph;
    }, projectId);
  }

  // タスクを削除
  async deleteTask(projectId: string, taskName: string) {
    return await this.updateTaskgraph(taskgraph => {
      const taskIndex = taskgraph.tasks.findIndex(task => task.name === taskName);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskName} not found`);
      }
      taskgraph.tasks.splice(taskIndex, 1);
      return taskgraph;
    }, projectId);
  }
}