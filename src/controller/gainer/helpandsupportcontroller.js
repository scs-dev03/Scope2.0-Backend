import { helpsupportApi, IssueMAster , subissueMaster } from "../../services/gainer/helpandsupportService.js"

const helpandsupportservice = async (req, res) => {
      try {

        await helpsupportApi(req, res) 

      } catch (error) {
        res.status(500).json({ Error: error.message })
      }
    }

const IssueMAsterService = async(req,res)=>{
 try {
   await IssueMAster(req,res)
 } catch (error) {
  res.status(500).json({ Error: error.message })
 }
}
const subIssueMAsterService = async(req,res)=>{
 try {
   await subissueMaster(req,res)
 } catch (error) {
  res.status(500).json({ Error: error.message })
 }
}

export {helpandsupportservice,IssueMAsterService,subIssueMAsterService}