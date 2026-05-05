'use strict';

const express    = require('express');
const Database   = require('./database');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const cors       = require('cors');
const slugify    = require('slugify');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';

async function start() {
  const app = express();
  const db = await Database.initialize(path.join(__dirname, 'blog.db'));

  /* ─── Middlewares ─── */
  app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use(express.static(__dirname));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
  });

  /* ─── Upload de imagens ─── */
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
      cb(null, name);
    }
  });
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Apenas imagens são permitidas'));
    }
  });

  /* ─── Banco de dados ─── */
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL,
      email     TEXT    NOT NULL UNIQUE,
      password  TEXT    NOT NULL,
      role      TEXT    NOT NULL DEFAULT 'admin',
      created_at TEXT   DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL,
      slug TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      slug        TEXT    NOT NULL UNIQUE,
      excerpt     TEXT,
      content     TEXT,
      cover_url   TEXT,
      category_id INTEGER REFERENCES categories(id),
      status      TEXT    NOT NULL DEFAULT 'draft',
      featured    INTEGER NOT NULL DEFAULT 0,
      read_time   INTEGER DEFAULT 5,
      author_id   INTEGER REFERENCES users(id),
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletter (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  /* ─── Seed ─── */
  const cats = [
    { name: 'Layout Estratégico', slug: 'layout' },
    { name: 'Fachada', slug: 'fachada' },
    { name: 'Iluminação', slug: 'iluminacao' },
    { name: 'Vitrine', slug: 'vitrine' },
    { name: 'Tendências', slug: 'tendencias' },
  ];
  cats.forEach(c => {
    try {
      db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(c.name, c.slug);
    } catch (e) {}
  });

  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@leticia.com');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Letícia Rufino', 'admin@leticia.com', hash, 'admin');
    console.log('✅ Admin criado → admin@leticia.com / admin123');
  }

  /* ─── AUTH ─── */
  function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token ausente' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Token inválido' });
    }
  }

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  app.post('/api/auth/change-password', authMiddleware, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(400).json({ error: 'Senha atual incorreta' });
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ ok: true });
  });

  /* ─── CATEGORIAS ─── */
  app.get('/api/categories', (req, res) => {
    const rows = db.prepare(`
      SELECT c.*, COUNT(p.id) as post_count
      FROM categories c
      LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    res.json(rows);
  });

  app.post('/api/categories', authMiddleware, (req, res) => {
    const { name } = req.body;
    const slug = slugify(name, { lower: true, strict: true, locale: 'pt' });
    try {
      const info = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug);
      res.status(201).json({ id: info.lastInsertRowid, name, slug });
    } catch {
      res.status(400).json({ error: 'Categoria já existe' });
    }
  });

  /* ─── POSTS – públicos ─── */
  app.get('/api/posts', (req, res) => {
    const { category, status = 'published', page = 1, limit = 9, featured } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = ['p.status = ?'];
    let params = [status];

    if (category) { where.push('c.slug = ?'); params.push(category); }
    if (featured !== undefined) { where.push('p.featured = ?'); params.push(Number(featured)); }

    const whereStr = 'WHERE ' + where.join(' AND ');

    const total = db.prepare(`SELECT COUNT(*) as n FROM posts p LEFT JOIN categories c ON c.id = p.category_id ${whereStr}`).get(...params)?.n || 0;

    const rows = db.prepare(`
      SELECT p.id, p.title, p.slug, p.excerpt, p.cover_url, p.featured, p.read_time, p.status, p.created_at, p.updated_at,
             c.name AS category_name, c.slug AS category_slug, u.name AS author_name
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN users u ON u.id = p.author_id
      ${whereStr}
      ORDER BY p.featured DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    res.json({ posts: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  });

  app.get('/api/posts/:slug', (req, res) => {
    const post = db.prepare(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug, u.name AS author_name
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN users u ON u.id = p.author_id
      WHERE p.slug = ?
    `).get(req.params.slug);

    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    res.json(post);
  });

  /* ─── POSTS – admin ─── */
  app.get('/api/admin/posts', authMiddleware, (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = [];
    let params = [];
    if (status) { where.push('p.status = ?'); params.push(status); }
    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const total = db.prepare(`SELECT COUNT(*) as n FROM posts p ${whereStr}`).get(...params)?.n || 0;
    const rows = db.prepare(`
      SELECT p.id, p.title, p.slug, p.status, p.featured, p.read_time, p.created_at, p.updated_at, c.name AS category_name
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereStr}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    res.json({ posts: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  });

  app.get('/api/admin/posts/:id', authMiddleware, (req, res) => {
    const post = db.prepare(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug, u.name AS author_name
      FROM posts p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN users u ON u.id = p.author_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    res.json(post);
  });

  app.post('/api/admin/posts', authMiddleware, (req, res) => {
    const { title, excerpt, content, cover_url, category_id, status, featured, read_time } = req.body;
    const slug = makeUniqueSlug(title);
    const info = db.prepare(`
      INSERT INTO posts (title, slug, excerpt, content, cover_url, category_id, status, featured, read_time, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, excerpt, content, cover_url, category_id, status || 'draft', featured ? 1 : 0, read_time || 5, req.user.id);
    res.status(201).json({ id: info.lastInsertRowid, slug });
  });

  app.put('/api/admin/posts/:id', authMiddleware, (req, res) => {
    const { title, excerpt, content, cover_url, category_id, status, featured, read_time } = req.body;
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Post não encontrado' });
    db.prepare(`
      UPDATE posts SET title = ?, excerpt = ?, content = ?, cover_url = ?, category_id = ?, status = ?, featured = ?, read_time = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, excerpt, content, cover_url, category_id, status, featured ? 1 : 0, read_time, req.params.id);
    res.json({ ok: true });
  });

  app.delete('/api/admin/posts/:id', authMiddleware, (req, res) => {
    const info = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Post não encontrado' });
    res.json({ ok: true });
  });

  app.post('/api/admin/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  /* ─── NEWSLETTER ─── */
  app.post('/api/newsletter', (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'E-mail inválido' });
    try {
      db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email);
      res.json({ ok: true });
    } catch {
      res.status(400).json({ error: 'E-mail já cadastrado' });
    }
  });

  app.get('/api/admin/newsletter', authMiddleware, (req, res) => {
    const rows = db.prepare('SELECT * FROM newsletter ORDER BY created_at DESC').all();
    res.json(rows);
  });

  /* ─── Helpers ─── */
  function makeUniqueSlug(title) {
    const base = slugify(title, { lower: true, strict: true, locale: 'pt' });
    let slug = base, i = 1;
    while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug)) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  /* ─── Start ─── */
  app.listen(PORT, () => console.log(`🚀 API rodando em http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('❌ Erro ao iniciar:', err);
  process.exit(1);
});
