import 'dotenv/config'
import {connectDB} from "./db/db.js"
import {app}  from "./app.js"
import cron from 'node-cron'
import { scheduleTask, siRefresh } from './controller/dashboardSchedulerController.js'
const PORT = process.env.PORT || 3000
// connectDB()
// // .then(()=>{
// //     app.listen(PORT,()=>{
// //         console.log(`Server is runnning at PORT: ${PORT}`)
// //     })
// // })
// .catch((err)=>{
//     console.log(" connection failed",err);
// })
// .finally(() => {
//   app.listen(PORT, () => {
//     console.log(`Server is running at PORT: ${PORT}`);
//   });
//   });
// async function start() {
//   try {
//     await connectDB();         // waits for ALL pools (or throws on first error)
//     app.listen(PORT, () => {
//       console.log(`Server is running at PORT: ${PORT}`);
//     });
//   } catch (err) {
//     console.error('DB connection failed—aborting start:', err);
//     process.exit(1);
//   }
// }

// start();



async function start() {
  try {
    // 1) Connect your DB pools
    await connectDB();
    console.log('DB connected, scheduling jobs…');

    // 2) Schedule your cron jobs:

    // ────────────────────────────────────────────────
    // Run `scheduleTask()` every minute:
    // cron.schedule('*/1 * * * *', async () => {
    //   await connectDB().catch(err => console.error('connectDB error', err));
    //   console.log('⚙️  Running scheduleTask at', new Date().toISOString());
    //   scheduleTask().catch(err => console.error('scheduleTask error', err));
    // });

    // // // Run `siRefresh()` every 5 minutes:
    // cron.schedule('*/15 * * * *', async () => {
    //   await connectDB().catch(err => console.error('connectDB error', err));
    //   console.log('🔄 Running siRefresh at', new Date().toISOString());
    //   siRefresh().catch(err => console.error('siRefresh error', err));
    // });
    // ────────────────────────────────────────────────

    // 3) Then start your HTTP server:
    app.listen(PORT, () => {
      console.log(`Server is running at :${PORT}`);
    });
  } 
  catch (err) {
    console.error('Failed to start application:', err);
    process.exit(1);
  }
}

start();