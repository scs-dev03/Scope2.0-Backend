// import sql from 'mssql'
// import "dotenv/config"
// const config1 = {

//     server: process.env.SERVER,    // SQL Server hostname or IP address
//     database: process.env.DATABASE,    // Your database name
//     user: process.env.USER,                // SQL Server login username
//     password: process.env.PASSWORD,
//     port:Number(process.env.DB_PORT),        // SQL Server login password
//     options: {
//         encrypt: false,           // Disable encryption for local servers
//         enableArithAbort: true ,
//         trustServerCertificate: true,  // Helps with certain SQL Server errors
//     },
//     requestTimeout: 6000000, // 30 seconds
//     connectionTimeout: 30000, // 30 seconds
// };
 
// let pool;
// const connectDB = async()=>{
// pool = await new sql.connect(config1)
// // .connect()
// .then(pool => {
//     console.log(`Connected to ${process.env.SERVER} Server`);
//     return pool;
// })
// .catch(err => {
//     console.error('Database connection failed!', err);
//     throw err;
// });
// };


// const getPool1 = () => {
//   if (!pool) {
//       throw new Error("Database connection is not established yet");
//   }
//   return pool;
// };

// export {connectDB,getPool1};


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
    requestTimeout: 6000000,
    connectionTimeout: 30000,
};

const config3 = {
    server: process.env.SERVER3,
    database: process.env.DATABASE3,
    user: process.env.USER3,
    password: process.env.PASSWORD3,
    // port: Number(process.env.DB_PORT3),
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true,
    },
    requestTimeout: 6000000,
    connectionTimeout: 30000,
};

let pool1, pool2 , pool3;

const connectDB = async () => {
    try {
        pool1 = await new sql.ConnectionPool(config1).connect();
        console.log(`Connected to DB1: ${process.env.SERVER1} using ${process.env.USER1}`);

        pool2 = await new sql.ConnectionPool(config2).connect();
        console.log(`Connected to DB2: ${process.env.SERVER2} using ${process.env.USER2}`);

        // pool3 = await new sql.ConnectionPool(config3).connect();
        // console.log(`Connected to DB3: ${process.env.SERVER3} using ${process.env.USER3}`);
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

const getPool3 = () => {
    if (!pool3) throw new Error("DB3 not connected");
    return pool3;
};
// getPool1 -> for UAT Connection 
// getPool2 -> for Live Connection
// getPool3 -> for OGS Server Connection

export { connectDB, getPool1, getPool2  };
