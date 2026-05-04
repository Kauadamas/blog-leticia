const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let SQL = null;
let db = null;
let initialized = false;

// Inicialização síncrona do sql.js
function initializeSync() {
  return initSqlJs().then(sqlModule => {
    SQL = sqlModule;
    return sqlModule;
  });
}

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    
    if (!initialized) {
      // Iniciar sql.js sincronamente na importação
      initializeSync().then(() => {
        if (fs.existsSync(dbPath)) {
          const data = fs.readFileSync(dbPath);
          db = new SQL.Database(data);
        } else {
          db = new SQL.Database();
        }
        initialized = true;
      }).catch(err => {
        console.error('Erro ao inicializar SQLjs:', err);
        process.exit(1);
      });
    }
  }

  exec(sql) {
    if (!db) throw new Error('Database não inicializado');
    const statements = sql.split(';').filter(s => s.trim());
    statements.forEach(statement => {
      if (statement.trim()) {
        db.run(statement);
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
        const result = db.exec(sql, params);
        return self._resultToRows(result)[0] || undefined;
      },
      all(...params) {
        if (!db) throw new Error('Database não inicializado');
        const result = db.exec(sql, params);
        return self._resultToRows(result);
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

module.exports = Database;

