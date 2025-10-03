import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { exec } from 'child_process';
import { promisify } from 'util';

const app = express();
const PORT = 9393;
const execAsync = promisify(exec);

// プロジェクトルートのdataフォルダのパス
const DATA_DIR = path.join(process.cwd(), '..', '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');

// プロジェクトIDからファイルパスを生成
const getTaskgraphFilePath = (projectId) => {
  return path.join(DATA_DIR, `${projectId}.taskgraph.json`);
};

// バックアップファイルパスを生成
const getBackupFilePath = (projectId, datetime) => {
  return path.join(BACKUP_DIR, `${projectId}.${datetime}.json`);
};

// 古いバックアップファイルを削除（3日経過、ただし最新1件は必ず残す）
const cleanupOldBackups = async (projectId) => {
  try {
    // バックアップディレクトリが存在しない場合は作成
    try {
      await fs.access(BACKUP_DIR);
    } catch {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      return; // 新規作成の場合、削除対象なし
    }

    const files = await fs.readdir(BACKUP_DIR);
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3日前のタイムスタンプ
    
    // プロジェクトに関連するバックアップファイルのみをチェック
    const projectBackups = files.filter(file => 
      file.startsWith(`${projectId}.`) && file.endsWith('.json')
    );
    
    // バックアップファイルが1件以下の場合は削除しない
    if (projectBackups.length <= 1) {
      return;
    }
    
    // ファイルを更新時刻でソートして最新のファイルを特定
    const backupsWithStats = await Promise.all(
      projectBackups.map(async (file) => {
        const filePath = path.join(BACKUP_DIR, file);
        try {
          const stats = await fs.stat(filePath);
          return { file, filePath, mtime: stats.mtime.getTime() };
        } catch (error) {
          console.error(`バックアップファイル情報取得エラー: ${file}`, error);
          return null;
        }
      })
    );
    
    // nullを除外してソート（新しい順）
    const validBackups = backupsWithStats
      .filter(backup => backup !== null)
      .sort((a, b) => b.mtime - a.mtime);
    
    // 最新のファイルを除いて古いファイルを削除
    for (let i = 1; i < validBackups.length; i++) {
      const backup = validBackups[i];
      if (backup.mtime < threeDaysAgo) {
        try {
          await fs.unlink(backup.filePath);
          console.log(`古いバックアップファイルを削除: ${backup.file}`);
        } catch (error) {
          console.error(`バックアップファイル削除エラー: ${backup.file}`, error);
        }
      }
    }
  } catch (error) {
    console.error('バックアップクリーンアップエラー:', error);
  }
};

// 最新のバックアップ時刻を取得
const getLatestBackupTime = async (projectId) => {
  try {
    await fs.access(BACKUP_DIR);
    const files = await fs.readdir(BACKUP_DIR);
    
    // プロジェクトに関連するバックアップファイルを取得
    const projectBackups = files
      .filter(file => file.startsWith(`${projectId}.`) && file.endsWith('.json'))
      .map(file => {
        const stats = fs.stat(path.join(BACKUP_DIR, file));
        return { file, stats };
      });
    
    if (projectBackups.length === 0) {
      return null;
    }
    
    // 最新のファイルを見つける
    let latestTime = 0;
    for (const backup of projectBackups) {
      const stats = await backup.stats;
      if (stats.mtime.getTime() > latestTime) {
        latestTime = stats.mtime.getTime();
      }
    }
    
    return new Date(latestTime);
  } catch {
    return null; // バックアップディレクトリが存在しない場合
  }
};

app.use(cors());
app.use(express.json());

// エラーレスポンス生成ヘルパー
const createErrorResponse = (code, message, details = null) => {
  const response = {
    code,
    message,
    timestamp: new Date().toISOString(),
    requestId: Date.now().toString(),
  };
  if (details) {
    response.details = details;
  }
  return response;
};

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
      // ファイルが存在しない場合は404を返す
      console.log('File not found, returning 404');
      res.status(404).json({ error: 'Taskgraph file not found' });
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

// バックアップ作成エンドポイント
app.post('/api/backup-taskgraph', async (req, res) => {
  try {
    const { projectId = 'default' } = req.query;
    
    // 現在のファイルが存在するかチェック
    const taskgraphFile = getTaskgraphFilePath(projectId);
    try {
      await fs.access(taskgraphFile);
    } catch {
      return res.status(404).json({ error: 'Original taskgraph file not found' });
    }
    
    // 最新のバックアップ時刻を取得
    const latestBackupTime = await getLatestBackupTime(projectId);
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
    
    // 前回バックアップから10分経過していない場合はスキップ
    if (latestBackupTime && latestBackupTime > tenMinutesAgo) {
      return res.json({
        success: false,
        message: 'Backup skipped - less than 10 minutes since last backup',
        lastBackupTime: latestBackupTime.toISOString()
      });
    }
    
    // バックアップディレクトリを確認・作成
    try {
      await fs.access(BACKUP_DIR);
    } catch {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
    }
    
    // 日時文字列を生成 (YYYYMMDD-HHMMSS 形式)
    const datetime = now.toISOString()
      .replace(/[:-]/g, '')
      .replace(/\.\d{3}Z$/, '')
      .replace('T', '-');
    
    // バックアップファイル作成
    const backupFilePath = getBackupFilePath(projectId, datetime);
    const originalData = await fs.readFile(taskgraphFile, 'utf-8');
    await fs.writeFile(backupFilePath, originalData, 'utf-8');
    
    // 古いバックアップファイルを削除
    await cleanupOldBackups(projectId);
    
    console.log(`バックアップ作成: ${backupFilePath}`);
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backupFile: `${projectId}.${datetime}.json`,
      backupTime: now.toISOString()
    });
  } catch (error) {
    console.error('Failed to create backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
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

// プロジェクトの画像一覧取得エンドポイント
app.get('/api/project-images/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectDir = path.join(DATA_DIR, projectId);
    const taskgraphFile = getTaskgraphFilePath(projectId);
    
    // プロジェクト情報から登録済み画像のID情報を取得
    let registeredImages = [];
    try {
      const taskgraphData = await fs.readFile(taskgraphFile, 'utf-8');
      const taskgraph = JSON.parse(taskgraphData);
      registeredImages = taskgraph.info?.addition?.design_images || [];
    } catch {
      // ファイルが存在しない、または読み込みエラーの場合は空配列
      registeredImages = [];
    }
    
    // プロジェクトディレクトリの存在確認
    try {
      await fs.access(projectDir);
    } catch {
      // ディレクトリが存在しない場合は登録済み画像のみ返す
      return res.json({ images: registeredImages });
    }
    
    // ディレクトリ内のファイル一覧を取得
    const files = await fs.readdir(projectDir);
    
    // 画像ファイルのみをフィルタリング
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    // ファイル情報を取得してレスポンス用のデータを作成
    const diskImages = await Promise.all(imageFiles.map(async (filename) => {
      const fullPath = path.join(projectDir, filename);
      const relativePath = path.join('data', projectId, filename);
      
      try {
        const stats = await fs.stat(fullPath);
        
        // 登録済み画像からIDを検索（パスベース）
        const registeredImage = registeredImages.find(img => {
          if (typeof img === 'object' && img.path) {
            return img.path === relativePath;
          }
          if (typeof img === 'string') {
            return img === relativePath;
          }
          return false;
        });
        
        return {
          id: registeredImage?.id || null, // 登録済みの場合はID、そうでなければnull
          filename,
          path: relativePath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      } catch {
        // ファイル情報取得に失敗した場合はスキップ
        return null;
      }
    }));
    
    // nullを除外
    const validImages = diskImages.filter(img => img !== null);
    
    res.json({ images: validImages });
  } catch (error) {
    console.error('Failed to list project images:', error);
    res.status(500).json({ error: 'プロジェクト画像一覧の取得に失敗しました' });
  }
});

// ファイル一覧取得エンドポイント（git ls-files使用）
app.get('/api/file-list', async (req, res) => {
  try {
    const rootPath = req.query.rootPath;
    
    if (!rootPath) {
      return res.status(400).json({ error: 'rootPathパラメータが必要です' });
    }

    // パスの存在確認
    try {
      await fs.access(rootPath);
    } catch {
      return res.status(404).json({ error: '指定されたパスが存在しません' });
    }

    // 指定されたディレクトリがGitリポジトリか確認
    try {
      await execAsync('git rev-parse --git-dir', { cwd: rootPath });
    } catch {
      return res.status(400).json({ error: '指定されたパスはGitリポジトリではありません' });
    }

    // git ls-filesを実行してファイル一覧を取得
    const { stdout, stderr } = await execAsync('git ls-files', {
      cwd: rootPath,
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    if (stderr) {
      console.error('git ls-files error:', stderr);
    }

    // ファイルパスを配列に変換し、FileItem形式に変換
    const files = stdout
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(filePath => {
        const name = path.basename(filePath);
        const directory = path.dirname(filePath);
        return {
          path: filePath,
          name: name,
          directory: directory === '.' ? '' : directory
        };
      });

    res.json({ files });
  } catch (error) {
    console.error('Failed to get file list:', error);
    res.status(500).json({ 
      error: 'ファイル一覧の取得に失敗しました',
      details: error.message 
    });
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

// ========================================
// TypeSpec定義エンドポイントの実装
// ========================================

// GET /api/projects/{projectId} - プロジェクトのタスクグラフ取得
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = getTaskgraphFilePath(projectId);
    
    const data = await fs.readFile(filePath, 'utf-8');
    const taskgraph = JSON.parse(data);
    
    // TaskGraph形式に変換（配列の場合はオブジェクトに変換）
    let tasks = taskgraph.tasks || {};
    if (Array.isArray(tasks)) {
      // 配列の場合はオブジェクトに変換
      const tasksObj = {};
      tasks.forEach(task => {
        if (task && task.name) {
          tasksObj[task.name] = task;
        }
      });
      tasks = tasksObj;
    }
    
    const response = {
      version: '1.0.0',
      tasks: tasks
    };
    
    res.json(response);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json(
        createErrorResponse('PROJECT_NOT_FOUND', `Project '${req.params.projectId}' not found`)
      );
    } else {
      console.error('Failed to load project:', error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Failed to load project')
      );
    }
  }
});

// POST /api/projects/{projectId}/tasks - タスク作成
app.post('/api/projects/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, depends, difficulty, issueNumber, addition } = req.body;
    
    if (!name || !description) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Name and description are required', {
          validationErrors: [
            !name && { field: 'name', message: 'Name is required' },
            !description && { field: 'description', message: 'Description is required' }
          ].filter(Boolean)
        })
      );
    }
    
    const filePath = getTaskgraphFilePath(projectId);
    const data = await fs.readFile(filePath, 'utf-8');
    const taskgraph = JSON.parse(data);
    
    // タスクが既に存在するか確認
    let taskExists = false;
    if (Array.isArray(taskgraph.tasks)) {
      taskExists = taskgraph.tasks.some(t => t.name === name);
    } else if (taskgraph.tasks) {
      taskExists = !!taskgraph.tasks[name];
    }
    
    if (taskExists) {
      return res.status(409).json(
        createErrorResponse('DUPLICATE_TASK', `Task '${name}' already exists`, { taskName: name, projectId })
      );
    }
    
    // 新しいタスクを作成
    const newTask = {
      name,
      description,
      depends: depends || [],
      notes: [],
      difficulty: difficulty || 0,
      issueNumber: issueNumber || null,
      addition: addition || {}
    };
    
    // tasksが配列の場合は追加、オブジェクトの場合はキーとして設定
    if (Array.isArray(taskgraph.tasks)) {
      taskgraph.tasks.push(newTask);
    } else {
      if (!taskgraph.tasks) {
        taskgraph.tasks = {};
      }
      taskgraph.tasks[name] = newTask;
    }
    
    await fs.writeFile(filePath, JSON.stringify(taskgraph, null, 2), 'utf-8');
    res.json(newTask);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json(
        createErrorResponse('PROJECT_NOT_FOUND', `Project '${req.params.projectId}' not found`)
      );
    } else {
      console.error('Failed to create task:', error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Failed to create task')
      );
    }
  }
});

// GET /api/projects/{projectId}/tasks/{taskName} - 特定タスク取得
app.get('/api/projects/:projectId/tasks/:taskName', async (req, res) => {
  try {
    const { projectId, taskName } = req.params;
    const filePath = getTaskgraphFilePath(projectId);
    
    const data = await fs.readFile(filePath, 'utf-8');
    const taskgraph = JSON.parse(data);
    
    // tasksが配列の場合は名前で検索、オブジェクトの場合はキーでアクセス
    let task;
    if (Array.isArray(taskgraph.tasks)) {
      task = taskgraph.tasks.find(t => t.name === taskName);
    } else {
      task = taskgraph.tasks && taskgraph.tasks[taskName];
    }
    
    if (!task) {
      return res.status(404).json(
        createErrorResponse('TASK_NOT_FOUND', `Task '${taskName}' not found`, { taskName, projectId })
      );
    }

    res.json(task);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json(
        createErrorResponse('PROJECT_NOT_FOUND', `Project '${req.params.projectId}' not found`)
      );
    } else {
      console.error('Failed to get task:', error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Failed to get task')
      );
    }
  }
});

// PUT /api/projects/{projectId}/tasks/{taskName} - タスク更新
app.put('/api/projects/:projectId/tasks/:taskName', async (req, res) => {
  try {
    const { projectId, taskName } = req.params;
    const updates = req.body;
    
    const filePath = getTaskgraphFilePath(projectId);
    const data = await fs.readFile(filePath, 'utf-8');
    const taskgraph = JSON.parse(data);
    
    // tasksが配列の場合は名前で検索、オブジェクトの場合はキーでアクセス
    let task;
    let taskIndex = -1;
    if (Array.isArray(taskgraph.tasks)) {
      taskIndex = taskgraph.tasks.findIndex(t => t.name === taskName);
      task = taskIndex !== -1 ? taskgraph.tasks[taskIndex] : null;
    } else {
      task = taskgraph.tasks && taskgraph.tasks[taskName];
    }
    
    if (!task) {
      return res.status(404).json(
        createErrorResponse('TASK_NOT_FOUND', `Task '${taskName}' not found`, { taskName, projectId })
      );
    }

    // タスクを更新
    const updatedTask = {
      ...task,
      ...updates,
      name: taskName // 名前は変更不可
    };

    // tasksが配列の場合はインデックスで更新、オブジェクトの場合はキーで更新
    if (Array.isArray(taskgraph.tasks)) {
      taskgraph.tasks[taskIndex] = updatedTask;
    } else {
      taskgraph.tasks[taskName] = updatedTask;
    }
    await fs.writeFile(filePath, JSON.stringify(taskgraph, null, 2), 'utf-8');

    res.json(updatedTask);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json(
        createErrorResponse('PROJECT_NOT_FOUND', `Project '${req.params.projectId}' not found`)
      );
    } else {
      console.error('Failed to update task:', error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Failed to update task')
      );
    }
  }
});

// DELETE /api/projects/{projectId}/tasks/{taskName} - タスク削除
app.delete('/api/projects/:projectId/tasks/:taskName', async (req, res) => {
  try {
    const { projectId, taskName } = req.params;
    const filePath = getTaskgraphFilePath(projectId);
    
    const data = await fs.readFile(filePath, 'utf-8');
    const taskgraph = JSON.parse(data);
    
    // tasksが配列の場合は名前で検索、オブジェクトの場合はキーでアクセス
    let taskFound = false;
    let taskIndex = -1;
    if (Array.isArray(taskgraph.tasks)) {
      taskIndex = taskgraph.tasks.findIndex(t => t.name === taskName);
      taskFound = taskIndex !== -1;
    } else if (taskgraph.tasks) {
      taskFound = !!taskgraph.tasks[taskName];
    }
    
    if (!taskFound) {
      return res.status(404).json(
        createErrorResponse('TASK_NOT_FOUND', `Task '${taskName}' not found`, { taskName, projectId })
      );
    }

    // tasksが配列の場合は配列から削除、オブジェクトの場合はキーを削除
    if (Array.isArray(taskgraph.tasks)) {
      taskgraph.tasks.splice(taskIndex, 1);
    } else {
      delete taskgraph.tasks[taskName];
    }
    await fs.writeFile(filePath, JSON.stringify(taskgraph, null, 2), 'utf-8');

    res.status(204).send();
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json(
        createErrorResponse('PROJECT_NOT_FOUND', `Project '${req.params.projectId}' not found`)
      );
    } else {
      console.error('Failed to delete task:', error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Failed to delete task')
      );
    }
  }
});

// PATCH /api/projects/{projectId}/tasks/{taskName}/notes - ノート更新
app.patch('/api/projects/:projectId/tasks/:taskName/notes', async (req, res) => {
  try {
    const { projectId, taskName } = req.params;
    const { notes } = req.body;
    
    if (!Array.isArray(notes)) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Notes must be an array')
      );
    }
    
    const filePath = getTaskgraphFilePath(projectId);
    const data = await fs.readFile(filePath, 'utf-8');
    const taskgraph = JSON.parse(data);
    
    // tasksが配列の場合は名前で検索、オブジェクトの場合はキーでアクセス
    let task;
    let taskIndex = -1;
    if (Array.isArray(taskgraph.tasks)) {
      taskIndex = taskgraph.tasks.findIndex(t => t.name === taskName);
      task = taskIndex !== -1 ? taskgraph.tasks[taskIndex] : null;
    } else {
      task = taskgraph.tasks && taskgraph.tasks[taskName];
    }
    
    if (!task) {
      return res.status(404).json(
        createErrorResponse('TASK_NOT_FOUND', `Task '${taskName}' not found`, { taskName, projectId })
      );
    }

    task.notes = notes;
    await fs.writeFile(filePath, JSON.stringify(taskgraph, null, 2), 'utf-8');

    res.json(task);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json(
        createErrorResponse('PROJECT_NOT_FOUND', `Project '${req.params.projectId}' not found`)
      );
    } else {
      console.error('Failed to update notes:', error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Failed to update notes')
      );
    }
  }
});

// PATCH /api/projects/{projectId}/tasks/{taskName}/implementation - 実装メモ更新
app.patch('/api/projects/:projectId/tasks/:taskName/implementation', async (req, res) => {
  try {
    const { projectId, taskName } = req.params;
    const { implementation_notes } = req.body;

    if (!Array.isArray(implementation_notes)) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Implementation notes must be an array')
      );
    }
    
    const filePath = getTaskgraphFilePath(projectId);
    const data = await fs.readFile(filePath, 'utf-8');
    const taskgraph = JSON.parse(data);
    
    // tasksが配列の場合は名前で検索、オブジェクトの場合はキーでアクセス
    let task;
    let taskIndex = -1;
    if (Array.isArray(taskgraph.tasks)) {
      taskIndex = taskgraph.tasks.findIndex(t => t.name === taskName);
      task = taskIndex !== -1 ? taskgraph.tasks[taskIndex] : null;
    } else {
      task = taskgraph.tasks && taskgraph.tasks[taskName];
    }
    
    if (!task) {
      return res.status(404).json(
        createErrorResponse('TASK_NOT_FOUND', `Task '${taskName}' not found`, { taskName, projectId })
      );
    }

    if (!task.addition) {
      task.addition = {};
    }
    task.addition.implementation_notes = implementation_notes;
    await fs.writeFile(filePath, JSON.stringify(taskgraph, null, 2), 'utf-8');

    res.json(task);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json(
        createErrorResponse('PROJECT_NOT_FOUND', `Project '${req.params.projectId}' not found`)
      );
    } else {
      console.error('Failed to update implementation notes:', error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Failed to update implementation notes')
      );
    }
  }
});

// PATCH /api/projects/{projectId}/tasks/{taskName}/requirements - 要件更新
app.patch('/api/projects/:projectId/tasks/:taskName/requirements', async (req, res) => {
  try {
    const { projectId, taskName } = req.params;
    const { requirements } = req.body;

    if (!Array.isArray(requirements)) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Requirements must be an array')
      );
    }
    
    const filePath = getTaskgraphFilePath(projectId);
    const data = await fs.readFile(filePath, 'utf-8');
    const taskgraph = JSON.parse(data);
    
    // tasksが配列の場合は名前で検索、オブジェクトの場合はキーでアクセス
    let task;
    let taskIndex = -1;
    if (Array.isArray(taskgraph.tasks)) {
      taskIndex = taskgraph.tasks.findIndex(t => t.name === taskName);
      task = taskIndex !== -1 ? taskgraph.tasks[taskIndex] : null;
    } else {
      task = taskgraph.tasks && taskgraph.tasks[taskName];
    }
    
    if (!task) {
      return res.status(404).json(
        createErrorResponse('TASK_NOT_FOUND', `Task '${taskName}' not found`, { taskName, projectId })
      );
    }

    if (!task.addition) {
      task.addition = {};
    }
    task.addition.requirements = requirements;
    await fs.writeFile(filePath, JSON.stringify(taskgraph, null, 2), 'utf-8');

    res.json(task);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json(
        createErrorResponse('PROJECT_NOT_FOUND', `Project '${req.params.projectId}' not found`)
      );
    } else {
      console.error('Failed to update requirements:', error);
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Failed to update requirements')
      );
    }
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});