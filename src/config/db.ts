// filepath: d:\Lads\api_fisioterapia\src\config\db.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config(); // Carrega as variáveis de ambiente do .env

const host =
  (process.env.DB_HOST || "localhost").toLowerCase() === "localhost"
    ? "127.0.0.1"
    : process.env.DB_HOST;

const pool = mysql.createPool({
  host,
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10, // Limite de conexões no pool
  queueLimit: 0, // Sem limite na fila de espera por conexões
});

// Inicializa o schema mínimo necessário para a aplicação funcionar
async function initializeSchema() {
  try {
    // Tabelas essenciais: perfil e usuario
    await pool.query(`
      CREATE TABLE IF NOT EXISTS perfil (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(50) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome_completo VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NULL,
        cpf VARCHAR(14) UNIQUE NULL,
        semestre VARCHAR(10) NULL,
        perfil_id INT NOT NULL,
        CONSTRAINT fk_usuario_perfil FOREIGN KEY (perfil_id) REFERENCES perfil(id)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed de perfis (IDs fixos para compatibilidade com o código)
    await pool.query(
      `INSERT IGNORE INTO perfil (id, nome) VALUES (1, 'Admin'), (2, 'Fisioterapeuta'), (3, 'Aluno')`
    );

    // Seed de usuário admin padrão (senha: 123456)
    const adminEmail = "admin@local";
    const [users]: any = await pool.query(
      "SELECT id FROM usuario WHERE email = ?",
      [adminEmail]
    );
    if (users.length === 0) {
      const senhaHash = await bcrypt.hash("123456", 10);
      await pool.query(
        `INSERT INTO usuario (nome_completo, email, senha_hash, perfil_id) VALUES (?, ?, ?, ?)`,
        ["Administrador", adminEmail, senhaHash, 1]
      );
      console.log(
        "Usuário admin padrão criado: email=admin@local senha=123456"
      );
    }
  } catch (err) {
    console.error("Erro ao inicializar o schema do banco:", err);
  }
}

// Testa a conexão e inicializa schema
pool
  .getConnection()
  .then(async (connection) => {
    console.log("Conectado ao banco de dados MySQL com sucesso!");
    connection.release();
    await initializeSchema();
  })
  .catch((err) => {
    console.error("Erro ao conectar ao banco de dados MySQL:", err);
    // process.exit(1);
  });

export default pool;
