import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 3333;

// プロジェクトルートのtaskgraph-data.jsonのパス
const TASKGRAPH_FILE = path.join(process.cwd(), '..', '..', 'taskgraph-data.json');

app.use(cors());
app.use(express.json());

// タスクグラフデータを保存
app.post('/api/save-taskgraph', async (req, res) => {
  try {
    const jsonData = JSON.stringify(req.body, null, 2);
    await fs.writeFile(TASKGRAPH_FILE, jsonData, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save taskgraph:', error);
    res.status(500).json({ error: 'Failed to save taskgraph' });
  }
});

// タスクグラフデータを読み込み
app.get('/api/load-taskgraph', async (req, res) => {
  try {
    const data = await fs.readFile(TASKGRAPH_FILE, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data); // JSONを直接送信
  } catch (error) {
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合は404を返す
      res.status(404).json({ error: 'Taskgraph file not found' });
    } else {
      console.error('Failed to load taskgraph:', error);
      res.status(500).json({ error: 'Failed to load taskgraph' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Taskgraph file path: ${TASKGRAPH_FILE}`);
});