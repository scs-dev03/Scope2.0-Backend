import express from 'express'
import cors from 'cors'
// import { scheduleTask, siRefresh } from './controller/dashboardSchedulerController.js'
import dashboardSchedule from './routes/dashboardSchedulerRoute.js'
import salesView from './routes/salesViewRoute.js'
import MasterApi from './routes/MasterApiRoute.js'
import von from './routes/vonRoute.js'
import appRoutes from './routes/index.js'
import dm from './routes/dealermonitoringRoute.js'
import aap from './routes/auto-approval/index.js'
import automailers from './routes/automailers/automailer.js'
import gainer from './routes/Gainer/helpsupport.js'
const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// scheduleTask()
// siRefresh()

// setTimeout(()=>scheduleTask(),4000)
// setTimeout(()=>siRefresh(),3000)


app.use('/api', appRoutes);
app.use("/api/v1/master", MasterApi)
app.use("/api/v1/dashboardscheduler", dashboardSchedule)
app.use("/api/v1/salesview", salesView)
app.use("/api/v1/von", von)
app.use("/api/v1/dm", dm)
app.use("/api/v1", aap)
app.use("/api/v1/automailer",automailers)
app.use("/api/v1/gnr",gainer)

export { app }