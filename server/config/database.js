const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Log connection details for debugging
console.log("MYSQL ENV:", {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  db: process.env.MYSQL_DATABASE
});

// MySQL connection config (NO default values!)
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
};

// Create pool
const mysqlPool = mysql.createPool(MYSQL_CONFIG);

module.exports = mysqlPool;
module.exports.default = mysqlPool; 
