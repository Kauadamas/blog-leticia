const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let SQL = null;
let db = null;

class DatabaseWrapper {
  static async initialize(dbPath) {
    if (!SQL) {
      SQL = await initSqlJs();
    }

    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath);
      db = new SQL.Database(data);
    } else {
      db = new SQL.Database();
    }

    return new DatabaseWrapper(dbPath);
  }

  constructor(dbPath) {
    this.dbPath = dbPath;
  }

  exec(sql) {
    if (!db) throw new Error('Database não inicializado');
    const statements = sql.split(';').filter(s => s.trim());
    statements.forEach(statement => {
      if (statement.trim()) {
        try {
          db.run(statement);
        } catch (e) {
          // Ignore se a tabela já existe
        }
      }
    });
    this.save();
    return this;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        if (!db) throw new Error('Database não inicializado');
        db.run(sql, params);
        self.save();
        return { lastInsertRowid: 1, changes: 1 };
      },
      get(...params) {
        if (!db) throw new Error('Database não inicializado');
        try {
          const result = db.exec(sql, params);
          return self._resultToRows(result)[0] || undefined;
        } catch (e) {
          return undefined;
        }
      },
      all(...params) {
        if (!db) throw new Error('Database não inicializado');
        try {
          const result = db.exec(sql, params);
          return self._resultToRows(result);
        } catch (e) {
          return [];
        }
      }
    };
  }

  _resultToRows(result) {
    if (!result || !result[0] || !result[0].values) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  save() {
    if (!this.dbPath || !db) return;
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      const data = db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      console.error('Erro ao salvar banco de dados:', err);
    }
  }

  close() {
    if (db) {
      this.save();
      db.close();
      db = null;
    }
  }
}

module.exports = DatabaseWrapper;
