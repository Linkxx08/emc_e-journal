// models/Article.js
const db = require('../database');

class Article {
  static createTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        category TEXT,
        featured INTEGER DEFAULT 0,
        archive INTEGER DEFAULT 0
      )
    `);
  }

  // Ensure DB schema has all expected columns (handles older deployments).
  static ensureColumns() {
    const required = {
      subtitle: 'TEXT',
      image_url: 'TEXT',
      category: 'TEXT',
      featured: 'INTEGER DEFAULT 0',
      archive: 'INTEGER DEFAULT 0'
    };

    const columns = db.prepare(`PRAGMA table_info(articles)`).all()
      .reduce((acc, col) => {
        acc[col.name] = true;
        return acc;
      }, {});

    Object.entries(required).forEach(([name, definition]) => {
      if (!columns[name]) {
        db.exec(`ALTER TABLE articles ADD COLUMN ${name} ${definition}`);
      }
    });
  }

  static findAll(includeArchived = false) {
    let query = 'SELECT * FROM articles';
    if (!includeArchived) {
      query += ' WHERE archive = 0 OR archive IS NULL';
    }
    query += ' ORDER BY created_at DESC';
    const stmt = db.prepare(query);
    const results = stmt.all();
    // Convertir les entiers en booléens pour compatibilité
    return results.map(row => ({
      ...row,
      featured: row.featured === 1 || row.featured === true,
      archive: row.archive === 1 || row.archive === true
    }));
  }

  static findArchived() {
    const stmt = db.prepare('SELECT * FROM articles WHERE archive = 1 ORDER BY created_at DESC');
    const results = stmt.all();
    return results.map(row => ({
      ...row,
      featured: row.featured === 1 || row.featured === true,
      archive: row.archive === 1 || row.archive === true
    }));
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM articles WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      featured: row.featured === 1 || row.featured === true,
      archive: row.archive === 1 || row.archive === true
    };
  }

  static create(title, subtitle, content, category, imageUrl) {
    const stmt = db.prepare(`
      INSERT INTO articles (title, subtitle, content, category, image_url, featured, archive)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `);
    const info = stmt.run(title, subtitle || null, content, category || null, imageUrl || null);
    return { id: info.lastInsertRowid, title, subtitle, content, category, image_url: imageUrl };
  }

  static update(id, title, subtitle, content, category, imageUrl, featured = null) {
    let query = 'UPDATE articles SET title = ?, subtitle = ?, content = ?, category = ?, image_url = ?';
    const params = [title, subtitle || null, content, category || null, imageUrl || null];
    
    if (featured !== null) {
      query += ', featured = ?';
      params.push(featured ? 1 : 0);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const stmt = db.prepare(query);
    stmt.run(...params);
    return Article.findById(id);
  }

  static archive(id) {
    const stmt = db.prepare('UPDATE articles SET archive = 1 WHERE id = ?');
    stmt.run(id);
    return Article.findById(id);
  }

  static dearchive(id) {
    const stmt = db.prepare('UPDATE articles SET archive = 0 WHERE id = ?');
    stmt.run(id);
    return Article.findById(id);
  }
}

// Initialiser la table au chargement
Article.createTable();
Article.ensureColumns();

module.exports = Article;

