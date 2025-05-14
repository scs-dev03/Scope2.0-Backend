import { partfamilySaleservice, singlePartMaxByLocationService } from "../../services/norms-management/utils.service.js";
import { orderDetailsByPartnumberService } from "../../services/orderDetails/orderDetailsService.js";
import { partDetailsservice } from "../../services/salesview/salesviewservices.js";
import {groupStock, jobCardByVehicleService, partDescwithStockandQuality,  partsByJobCardService,  partSubstituteDetailService,  reservedForVehicle} from  "../../services/dealerMonitoring/dealerMonitoringService.js";


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

const partStock = async(req,res)=>{
try {
        const {brandid,dealerid,locationid,partnumber} = req.body
        if(!brandid ||!dealerid || !locationid ||!partnumber){
            return res.status(400).json({
                message:`brandid,dealerid,locationid,partnumber are required`
            })
        }
        // const data = await partDescwithStockandQuality(brandid,dealerid,locationid,partnumber)   
        // const data2 = await reservedForVehicle(dealerid,partnumber)
        // const data3 = await groupStock(brandid,locationid,partnumber)
        const [data, data2, data3] = await Promise.all([
            partDescwithStockandQuality(brandid, dealerid, locationid, partnumber),
            reservedForVehicle(dealerid, partnumber),
            groupStock(brandid, locationid, partnumber)
        ]);
        
        res.status(200).json({
            Details:data.recordset,
            Reserved:data2.recordset,
            Group:data3.recordset
            })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

const vehicleSearch = async (req,res)=>{
    const {dealerid,vehicleno , filter} = req.body
    const data = await jobCardByVehicleService(filter,vehicleno,dealerid)
    // const data2 = await partsByJobCard(dealerid,jobcardo)

    res.status(200).json({
        JobCards:data.recordset
    })
}

const partSearch = async (req,res)=>{
    const {dealerid,jobcardno} = req.body
    const data = await partsByJobCardService(dealerid,jobcardno)
    // const data2 = await partsByJobCard(dealerid,jobcardo)

    res.status(200).json({
        JobCards:data.recordset
    })
}

const substituteParts = async (req,res)=>{
try {
        const {brandid,partnumber} = req.body
        if(!brandid ||!partnumber){
            return res.status(400).json({
                message:`brandid,partnumber are required`
            })
        }
        const data = await partSubstituteDetailService(brandid,partnumber)
        res.status(200).json({
            Data:data.recordset
        })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

export {partSale,partDetails,singlePartMaxByLocation,orderDetailsByPartnumber,partStock,vehicleSearch,partSearch,substituteParts}