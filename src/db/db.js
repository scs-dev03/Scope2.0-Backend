import sql from 'mssql'
import "dotenv/config"
const config1 = {

    server: process.env.SERVER,    // SQL Server hostname or IP address
    database: process.env.DATABASE,    // Your database name
    user: process.env.USER,                // SQL Server login username
    password: process.env.PASSWORD,
    port:Number(process.env.DB_PORT),        // SQL Server login password
    options: {
        encrypt: false,           // Disable encryption for local servers
        enableArithAbort: true ,
        trustServerCertificate: true,  // Helps with certain SQL Server errors
    },
    requestTimeout: 600000, // 30 seconds
    connectionTimeout: 30000, // 30 seconds
};
 
let pool;
const connectDB = async()=>{
pool = await new sql.connect(config1)
// .connect()
.then(pool => {
    console.log(`Connected to ${process.env.SERVER} Server`);
    return pool;
})
.catch(err => {
    console.error('Database connection failed!', err);
    throw err;
});
};


const getPool1 = () => {
  if (!pool) {
      throw new Error("Database connection is not established yet");
  }
  return pool;
};

export {connectDB,getPool1};