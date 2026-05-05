const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let SQL = null;

class DatabaseWrapper {
  static async initialize(dbPath) {
    if (!SQL) SQL = await initSqlJs();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const db = fs.existsSync(dbPath)
      ? new SQL.Database(fs.readFileSync(dbPath))
      : new SQL.Database();
    return new DatabaseWrapper(db, dbPath);
  }

  constructor(db, dbPath) {
    this.db = db;
    this.dbPath = dbPath;
  }

  exec(sql) {
    this.db.exec(sql);
    this.save();
    return this;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        const before = self.db.getRowsModified();
        self.db.run(sql, params);
        const last = self.db.exec('SELECT last_insert_rowid() AS id')?.[0]?.values?.[0]?.[0] || 0;
        const changes = Math.max(self.db.getRowsModified() - before, 0);
        self.save();
        return { lastInsertRowid: last, changes };
      },
      get(...params) {
        return self._rows(sql, params)[0];
      },
      all(...params) {
        return self._rows(sql, params);
      }
    };
  }

  _rows(sql, params) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  save() {
    fs.writeFileSync(this.dbPath, Buffer.from(this.db.export()));
  }

  close() {
    this.save();
    this.db.close();
  }
}

module.exports = DatabaseWrapper;
