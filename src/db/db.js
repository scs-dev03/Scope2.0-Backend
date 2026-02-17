import sql from 'mssql'
import "dotenv/config"

const config = {
    server: process.env.SERVER,
    database: process.env.DATABASE,
    user: process.env.USER,
    password: process.env.PASSWORD,
    // port: Number(process.env.DB_PORT1),
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true,
    },
    requestTimeout: 6000000,
    connectionTimeout: 30000,
};


let pool;

const connectDB = async () => {
    try {
        pool = await new sql.ConnectionPool(config).connect();
        console.log(`Connected to DB: ${process.env.SERVER} using ${process.env.USER}`);

    } catch (err) {
        console.error("Database connection failed!", err);
        throw err;
    }
};

const getPool = () => {
    if (!pool) throw new Error("DB not connected");
    return pool;
};


export { connectDB, getPool };
