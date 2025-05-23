import { partfamilySaleservice, singlePartMaxByLocationService } from "../../services/norms-management/utils.service.js";
import { orderDetailsByPartnumberService } from "../../services/orderDetails/orderDetailsService.js";
import { partDetailsservice } from "../../services/salesview/salesviewservices.js";
import {advisorwisePPNIValueService, groupStock, jobCardByVehicleService, locationwisePPNIValueService, partDescwithStockandQuality,  partsByJobCardService,  partSubstituteDetailService,  partwisePPNIValueService,  reservedForVehicle, userroleService, vehiclewisePPNIValueService} from  "../../services/dealerMonitoring/dealerMonitoringService.js";


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

const userRole = async(req,res)=>{
try {
        const {userId} = req.body
        if(!userId){
            return res.status(400).json({
                message:`userId is required`
            })
        }
        const data = await userroleService(userId)
        // console.log(data.recordset[0].Role);
        res.status(200).json({
            message:data.recordset[0].Role
        })
        
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

const locationwisePPNIValue = async(req,res)=>{
try {
        const {dealerid , nonstockable , jobcardstatus} = req.body
        if(!dealerid || !nonstockable || !jobcardstatus){
            return res.status(400).json({
                message:`dealerid , nonstockable and partstatus is required`
            })
        }
       const data = await locationwisePPNIValueService(dealerid,jobcardstatus,nonstockable)
       res.status(200).json({
        Data: data.recordset
       })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

const advisorwisePPNIValue = async(req,res)=>{
try {
        const {dealerid , locationid, nonstockable , jobcardstatus} = req.body
        if(!dealerid || !locationid || !nonstockable || !jobcardstatus){
            return res.status(400).json({
                message:`dealerid , nonstockable and partstatus is required`
            })
        }
       const data = await advisorwisePPNIValueService(dealerid,locationid,jobcardstatus,nonstockable)
       res.status(200).json({
        Data: data.recordset
       })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

const vehiclewisePPNIValue = async(req,res)=>{
try {
        const {dealerid , locationid, nonstockable , jobcardstatus, advisor} = req.body
        if(!dealerid || !locationid|| !nonstockable || !jobcardstatus){
            return res.status(400).json({
                message:`dealerid , nonstockable and partstatus is required`
            })
        }
       const data = await vehiclewisePPNIValueService(dealerid,locationid,jobcardstatus,nonstockable,advisor)
       
       // Transform the flat data into grouped vehicle-wise structure
function transformVehiclePartsData(rawData) {
  const groupedData = {};

  rawData.forEach(item => {
    const vehicle = item.Vehiclenumber;

    if (!groupedData[vehicle]) {
      groupedData[vehicle] = {
        vehicleNumber: vehicle,
        ppniValue: 0,
        parts: []
      };
    }

    groupedData[vehicle].ppniValue += item.PPNI_Value;

    groupedData[vehicle].parts.push({
      partNumber: item.PartNumber,
      description: item.PartDesc,
      category: item.part_category,
      ndp: item.price,
      qty: item.Qty,
      value: item.PPNI_Value,
    });
  });

  return Object.values(groupedData);
}

const transformedData = transformVehiclePartsData(data.recordset);

       res.status(200).json({
        Data: transformedData
       })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}

const partwisePPNIValue = async(req,res)=>{
try {
        const {dealerid , locationid, nonstockable , jobcardstatus, advisor, vehicleno} = req.body
        if(!dealerid || !locationid|| !nonstockable || !jobcardstatus || !vehicleno){
            return res.status(400).json({
                message:`dealerid , nonstockable and partstatus is required`
            })
        }
       const data = await partwisePPNIValueService(dealerid,locationid,jobcardstatus , nonstockable , advisor , vehicleno)
       res.status(200).json({
        Data: data.recordset
       })
} catch (error) {
    res.status(500).json({
        Error:error.message
    })
}
}
export {partSale,partDetails,singlePartMaxByLocation,orderDetailsByPartnumber,partStock,vehicleSearch,partSearch,substituteParts,userRole,locationwisePPNIValue,advisorwisePPNIValue,vehiclewisePPNIValue,partwisePPNIValue}