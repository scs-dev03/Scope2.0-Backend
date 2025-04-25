import 'dotenv/config'
import {connectDB} from "./db/db.js"
import {app}  from "./app.js"
const PORT = process.env.PORT || 3000
connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`Server is runnning at PORT: ${PORT}`)
    })
})
.catch((err)=>{
    console.log(" connection failed",err);
})


// connectDB2()
// .then(()=>{
//     app.listen(PORT,()=>{
//         console.log(`Server is runnning at PORT: ${PORT}`)
//     })
// })
// .catch((err)=>{
//     console.log(" connection failed",err);
// })
// const currentDate = Date.now(); // Current timestamp in milliseconds
// const futureDate = currentDate + 24 * 60 * 60 * 1000; // Add 24 hours in milliseconds

// console.log("Current Date:", new Date(currentDate));
// console.log("Future Date (24 hours later):", new Date(futureDate));



