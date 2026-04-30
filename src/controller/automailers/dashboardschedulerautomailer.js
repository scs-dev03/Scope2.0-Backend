import { scheduleTask , siRefresh } from "../dashboardSchedulerController.js";

const dashboardRefresh = async(req,res)=>{
 try {
    await scheduleTask()
    return res.status(200).send(`⚙️  Running scheduleTask at, ${new Date().toISOString()}`)
 } catch (error) {

    return res.status(500).send(error.message)
 }
}

const siRefreshAuto = async(req,res)=>{
   try {
    await siRefresh()
    return res.status(200).send(`⚙️  Running siRefresh at, ${new Date().toISOString()}`)
 } catch (error) {
    return res.status(500).send(error.message)
 }
}

export {dashboardRefresh , siRefreshAuto}