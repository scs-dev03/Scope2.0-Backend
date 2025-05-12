import { partfamilySaleservice, singlePartMaxByLocationService } from "../../services/norms-management/utils.service.js";
import { orderDetailsByPartnumberService } from "../../services/orderDetails/orderDetailsService.js";
import { partDetailsservice } from "../../services/salesview/salesviewservices.js";


const partSale = async (req,res)=>{
    try {
        const { partnumber, brandid, dealerid, locationid } = req.body
        if (!partnumber || !brandid || !dealerid || !locationid) {
            return res.status(400).json({ message: `All fields are required` })
        }
        // console.log(typeof(partnumber) ,typeof(brandid) , typeof(dealerid) , typeof(locationid));
        const data = await partfamilySaleservice(brandid,dealerid,locationid,partnumber)
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


const singlePartMaxByLocation = async(req,res)=>{
try {
        const {partnumber , dealerid} = req.body
        if(!partnumber || !dealerid){
            return res.status(400).json({
                Error:`partnumber , dealerid are required`
            })
        }
    
        const data = await singlePartMaxByLocationService(dealerid,partnumber);
        res.status(200).json({
            Data:data.recordset
        })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

const orderDetailsByPartnumber = async(req,res)=>{
try {
            const {dealerid , locationid , partnumber , Udate , Ldate} = req.body
            if(!dealerid || !locationid || !partnumber || !Udate || !Ldate){
                return res.status(400).json({message:`dealerid , locationid , partnumber , Udate , Ldate are required`})
            }
            const data = await orderDetailsByPartnumberService(dealerid,locationid,partnumber,Udate,Ldate);
            res.status(200).json({
                Data:data.recordset
            })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

export {partSale,partDetails,singlePartMaxByLocation,orderDetailsByPartnumber}