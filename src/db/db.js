import sql from 'mssql'
import "dotenv/config"

const config1 = {
    server: process.env.SERVER1,
    database: process.env.DATABASE1,
    user: process.env.USER1,
    password: process.env.PASSWORD1,
    // port: Number(process.env.DB_PORT1),
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true,
    },
    requestTimeout: 6000000,
    connectionTimeout: 30000,
};

const config2 = {
    server: process.env.SERVER2,
    database: process.env.DATABASE2,
    user: process.env.USER2,
    password: process.env.PASSWORD2,
    // port: Number(process.env.DB_PORT2),
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true,
    },
      pool: {
    max: 10,               // up to 10 connections
    min: 0,                // no minimum
    idleTimeoutMillis: 36000000 // keep idle connections 10hr
  },
    requestTimeout: 6000000,
    connectionTimeout: 30000,
};

let pool1, pool2 , pool3,leadTimePool , pool4,ogysPool;

const connectDB = async () => {
    try {
        pool1 = await new sql.ConnectionPool(config1).connect();
        console.log(`Connected to DB1: ${process.env.SERVER1} using ${process.env.USER1}`);

        pool2 = await new sql.ConnectionPool(config2).connect();
        console.log(`Connected to DB2: ${process.env.SERVER2} using ${process.env.USER2}`);

    } catch (err) {
        console.error("Database connection failed!", err);
        throw err;
    }
};

const getPool1 = () => {
    if (!pool1) throw new Error("DB1 not connected");
    return pool1;
};

const getPool2 = () => {
    if (!pool2) throw new Error("DB2 not connected");
    return pool2;
};


const OgysPool = () => {
    if (!ogysPool) throw new Error("OGYS SERVER not connected");
    return ogysPool;
};

const getLeadTimePool=()=>{

    if(!leadTimePool)
        throw new Error("DB3 not connected");
    return leadTimePool

}
// getPool1 -> for UAT Connection 
// getPool2 -> for Live Connection
// getPool3 -> for OGS Server Connection

export { connectDB, getPool1, getPool2 ,getLeadTimePool  ,OgysPool};
