import { partfamilySaleservice } from "../../services/norms-management/utils.service.js";
import { partDetailsservice } from "../../services/salesview/salesviewservices.js";


const partSale = async (req,res)=>{
    try {
        const { partnumber, brandid, dealerid, locationid } = req.body
        if (!partnumber || !brandid || !dealerid || !locationid) {
            return res.status(400).json({ message: `All fields are required` })
        }
        const data = await partfamilySaleservice(brandid,dealerid,locationid,partnumber,res)
        // console.log(data);
        res.status(200).json({Data:data.recordset})
    } catch (error) {
        res.status(500).json({
            Error:error.message
        })
    }
}

const partDetails = async(req,res)=>{
try {
        const {brandid,dealerid,locationid,partnumber} = req.body
        if(!brandid || !dealerid || !locationid || !partnumber){
            return res.status(400).json({
                message:`All Fields are required`
            })
        }
        const data = await partDetailsservice(brandid,dealerid,locationid,partnumber,res)
        res.status(200).json({
            Data:data.recordset
        })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}
export {partSale,partDetails}