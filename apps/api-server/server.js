import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';

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

// ファイルの最終更新時刻を取得
app.get('/api/taskgraph-mtime', async (req, res) => {
  try {
    const { projectId = 'default' } = req.query;
    const taskgraphFile = getTaskgraphFilePath(projectId);
    
    try {
      const stats = await fs.stat(taskgraphFile);
      res.json({ 
        mtime: stats.mtime.toISOString(),
        exists: true 
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({ 
          mtime: null,
          exists: false 
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to get file mtime:', error);
    res.status(500).json({ error: 'Failed to get file modification time' });
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

// 画像アップロード用のmulter設定（一時ディレクトリに保存）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 一時的にDATAディレクトリに保存
    cb(null, DATA_DIR);
  },
  filename: (req, file, cb) => {
    // 元のファイル名をそのまま使用（temp_プレフィックスのみ追加）
    cb(null, `temp_${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // 画像ファイルのみ許可
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB制限
  }
});

// 画像アップロードエンドポイント
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルが選択されていません' });
    }

    const projectId = req.body.projectId || 'default';
    const projectDir = path.join(DATA_DIR, projectId);
    
    // プロジェクトディレクトリが存在しない場合は作成
    try {
      await fs.access(projectDir);
    } catch {
      await fs.mkdir(projectDir, { recursive: true });
    }

    // 最終的なファイル名を生成（temp_プレフィックスを削除して元のファイル名に戻す）
    const finalFilename = req.file.originalname;
    const finalPath = path.join(projectDir, finalFilename);
    const relativePath = path.join('data', projectId, finalFilename);

    // ファイルを正しい場所に移動
    await fs.rename(req.file.path, finalPath);

    res.json({
      success: true,
      filepath: relativePath,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Failed to upload image:', error);
    // 一時ファイルがあれば削除
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to cleanup temp file:', unlinkError);
      }
    }
    res.status(500).json({ error: '画像のアップロードに失敗しました' });
  }
});

// 画像配信エンドポイント
app.get('/api/images/*', async (req, res) => {
  try {
    const imagePath = req.params[0]; // data/projectId/filename.ext or absolute/path/to/file
    
    let fullPath;
    
    // 絶対パスの場合
    if (imagePath.startsWith('absolute/')) {
      const absolutePath = imagePath.replace('absolute', '');
      fullPath = absolutePath;
    } else {
      // 相対パス（プロジェクト内）の場合
      fullPath = path.join(process.cwd(), '..', '..', imagePath);
      
      // セキュリティチェック: dataディレクトリ以外へのアクセスを防ぐ
      const resolvedPath = path.resolve(fullPath);
      const dataPath = path.resolve(DATA_DIR);
      if (!resolvedPath.startsWith(dataPath)) {
        return res.status(403).json({ error: 'アクセスが拒否されました' });
      }
    }

    // ファイルの存在確認
    await fs.access(fullPath);
    
    // 画像のMIMEタイプを設定
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // ファイルをストリームで送信
    const fileStream = await fs.readFile(fullPath);
    res.send(fileStream);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: '画像が見つかりません' });
    } else {
      console.error('Failed to serve image:', error);
      res.status(500).json({ error: '画像の配信に失敗しました' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});