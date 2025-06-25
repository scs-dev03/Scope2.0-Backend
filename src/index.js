import 'dotenv/config'
import {connectDB} from "./db/db.js"
import {app}  from "./app.js"
const PORT = process.env.PORT ||3000
connectDB()
// .then(()=>{
//     app.listen(PORT,()=>{
//         console.log(`Server is runnning at PORT: ${PORT}`)
//     })
// })
.catch((err)=>{
    console.log(" connection failed",err);
})
.finally(() => {
  app.listen(PORT, () => {
    console.log(`Server is running at PORT: ${PORT}`);
  });
  });
