// タスクグラフのファイルI/O処理を分離
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// タスクグラフを読み込む
export function loadTaskgraph(projectId = 'default') {
  const dataDir = path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, `${projectId}.json`);
  
  if (!fs.existsSync(filePath)) {
    // ファイルが存在しない場合は空のタスクグラフを返す
    return {
      version: "1.0.0",
      tasks: {}
    };
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load taskgraph for project ${projectId}:`, error);
    return {
      version: "1.0.0",
      tasks: {}
    };
  }
}

// タスクグラフを保存する
export function saveTaskgraph(projectId, taskgraph) {
  const dataDir = path.join(process.cwd(), 'data');
  
  // データディレクトリが存在しない場合は作成
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, `${projectId}.json`);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(taskgraph, null, 2));
    return true;
  } catch (error) {
    console.error(`Failed to save taskgraph for project ${projectId}:`, error);
    return false;
  }
}

// プロジェクト一覧を取得
export function listProjects() {
  const dataDir = path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    return [];
  }
  
  try {
    return fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        id: path.basename(file, '.json'),
        name: path.basename(file, '.json')
      }));
  } catch (error) {
    console.error('Failed to list projects:', error);
    return [];
  }
}