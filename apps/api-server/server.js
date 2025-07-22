import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 3333;

// プロジェクトルートのdataフォルダのパス
const DATA_DIR = path.join(process.cwd(), '..', '..', 'data');

// プロジェクトIDからファイルパスを生成
const getTaskgraphFilePath = (projectId) => {
  return path.join(DATA_DIR, `${projectId}.taskgraph.json`);
};

app.use(cors());
app.use(express.json());

// タスクグラフデータを保存
app.post('/api/save-taskgraph', async (req, res) => {
  try {
    const { projectId = 'default' } = req.query;
    const taskgraphFile = getTaskgraphFilePath(projectId);
    const jsonData = JSON.stringify(req.body, null, 2);
    await fs.writeFile(taskgraphFile, jsonData, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save taskgraph:', error);
    res.status(500).json({ error: 'Failed to save taskgraph' });
  }
});

// タスクグラフデータを読み込み
app.get('/api/load-taskgraph', async (req, res) => {
  try {
    const { projectId = 'default' } = req.query;
    const taskgraphFile = getTaskgraphFilePath(projectId);
    console.log('Loading taskgraph from:', taskgraphFile);
    const data = await fs.readFile(taskgraphFile, 'utf-8');
    console.log('File loaded successfully, size:', data.length);
    res.setHeader('Content-Type', 'application/json');
    res.send(data); // JSONを直接送信
  } catch (error) {
    console.log('Error reading file:', error.code, error.message);
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合は空のタスクグラフを返す（MCPサーバーと同じ動作）
      const emptyTaskgraph = {
        info: {},
        tasks: []
      };
      console.log('File not found, returning empty taskgraph');
      res.setHeader('Content-Type', 'application/json');
      res.json(emptyTaskgraph);
    } else {
      console.error('Failed to load taskgraph:', error);
      res.status(500).json({ error: 'Failed to load taskgraph' });
    }
  }
});

// プロジェクト一覧取得
app.get('/api/projects', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const projects = files
      .filter(file => file.endsWith('.taskgraph.json'))
      .map(file => {
        const projectId = file.replace('.taskgraph.json', '');
        return { id: projectId, name: projectId };
      });
    res.json(projects);
  } catch (error) {
    console.error('Failed to list projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// 新規プロジェクト作成
app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body;
    
    // プロジェクト名のバリデーション
    if (!name) {
      return res.status(400).json({ error: 'プロジェクト名を指定してください' });
    }
    
    // 特殊文字のチェック
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'プロジェクト名に使用できるのは英数字、ハイフン、アンダースコアのみです' });
    }
    
    // dataディレクトリの確認と作成
    try {
      await fs.access(DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    
    // ファイルパスの設定
    const filePath = getTaskgraphFilePath(name);
    
    // 既存ファイルのチェック
    try {
      await fs.access(filePath);
      return res.status(409).json({ error: `プロジェクト '${name}' は既に存在します` });
    } catch {
      // ファイルが存在しない場合は正常
    }
    
    // プロジェクトファイルの作成
    const projectData = {
      info: {
        name: name
      },
      tasks: []
    };
    
    await fs.writeFile(filePath, JSON.stringify(projectData, null, 2), 'utf-8');
    
    res.json({ 
      success: true, 
      project: { id: name, name: name }
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ error: 'プロジェクトの作成に失敗しました' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});