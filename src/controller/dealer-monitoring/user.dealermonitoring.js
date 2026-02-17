import { partBrandMapping, partfamilySaleservice, partFamilyService, singlePartMaxByLocationService } from "../../services/norms-management/utils.service.js";
import { orderDetailsByPartnumberService, transformOrderData } from "../../services/orderDetails/orderDetailsService.js";
import { partDetailsservice } from "../../services/salesview/salesviewservices.js";
import { advisorwisePPNIValueService, groupStock, gainerListingService, jobCardByVehicleService, locationwisePPNIValueService, partInfo, partsByJobCardService, partSubstituteDetailService, partwisePPNIValueService, PPNIVALUE12MonthsService, reservedForVehicle, userroleService, vehicleSearchService, vehiclewisePPNIValueService, predictiveVehicleSearchService, vehicledealercheck, groupNorms, partfamilywiseStockColor, vehicleScore, vehicleSearchPagination, vehicleSearchlogsService, viewLogService, vehicleSearchConsentService } from "../../services/dealerMonitoring/dealerMonitoringService.js";
import { performance } from 'node:perf_hooks';
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ErrorLog } from "../../utils/dealerAppUtilis.js";

// import { transformOrderData } from "../../services/orderDetails/orderDetailsService.js";

const partSale = async (req, res) => {
    try {
        const { partnumber, brandid, dealerid, locationid, userId } = req.body
        if (!partnumber || !brandid || !dealerid || !locationid || !userId) {
            return res.status(400).json({ message: `All fields are required` })
        }
        const check = await partBrandMapping(brandid, partnumber)
        if (check == 0) {
            return res.status(400).json({
                message: `Invalid Partnumber`
            })
        }
        const [data1, data2, data3, data4, data5] = await Promise.all([
            partfamilySaleservice(brandid, dealerid, locationid, partnumber),
            singlePartMaxByLocationService(brandid, dealerid, locationid, partnumber),
            partFamilyService(partnumber, brandid),
            partInfo(brandid, partnumber),
            partfamilywiseStockColor(brandid, dealerid, locationid, partnumber)
        ])
        // console.log(data5.recordset);

        res.status(200).json({
            Details: data4.recordset,
            Sales: data1.recordset,
            Norms: data2.recordsets[0],
            Stock: data2.recordsets[1],
            PartFamily: data3.recordset,
            StockColor: data5.recordset
        })
    } catch (error) {
        res.status(500).json({
            Error: error.message
        })
    }
    finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('Sale Trend', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const partDetails = async (req, res) => {
    try {
        const { brandid, dealerid, locationid, partnumber } = req.body
        if (!brandid || !dealerid || !locationid || !partnumber) {
            return res.status(400).json({
                message: `All Fields are required`
            })
        }
        const data = await partDetailsservice(brandid, dealerid, locationid, partnumber, res)
        res.status(200).json({
            Data: data.recordset
        })
    } catch (error) {
        res.status(500).json({
            Error: error.message
        })
    }
}

const singlePartMaxByLocation = async (req, res) => {
    try {
        const { brandid, partnumber, locationid, dealerid, userId } = req.body
        if (!brandid || !partnumber || !dealerid || !locationid || !userId) {
            return res.status(400).json({
                Error: `brandid , partnumber , dealerid and userId are required`
            })
        }
        const check = await partBrandMapping(brandid, partnumber)
        if (check == 0) {
            return res.status(400).json({
                message: `Invalid Partnumber`
            })
        }
        const [data1, data2, data3] = await Promise.all([
            await partInfo(brandid, partnumber),
            await singlePartMaxByLocationService(brandid, dealerid, locationid, partnumber),
            await groupNorms(brandid, dealerid, locationid, partnumber)
        ])
        // console.log(data3);

        res.status(200).json({
            Details: data1.recordset,
            Norms: data2.recordsets[0],
            Stock: data2.recordsets[1],
            Group: data3.recordset
        })
    } catch (error) {
        res.status(500).json({
            Error: error.message
        })
    } finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('SCS Norms', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const orderDetailsByPartnumber = async (req, res) => {
    try {
        const { brandid, dealerid, locationid, partnumber, Udate, Ldate, userId } = req.body
        if (!dealerid || !locationid || !partnumber || !Udate || !Ldate || !userId) {
            return res.status(400).json({ message: `dealerid , locationid , partnumber , Udate , Ldate and userId are required` })
        }
        const check = await partBrandMapping(brandid, partnumber)
        if (check == 0) {
            return res.status(400).json({
                message: `Invalid Partnumber`
            })
        }
        // const [data1 , data2] = await Promise.all([
        //     orderDetailsByPartnumberService(dealerid,locationid,partnumber,Udate,Ldate),
        //     singlePartMaxByLocationService(brandid,dealerid,locationid,partnumber)
        // ])
        const [data1, data2, data3] = await Promise.all([
            partInfo(brandid, partnumber),
            singlePartMaxByLocationService(brandid, dealerid, locationid, partnumber),
            orderDetailsByPartnumberService(brandid, dealerid, locationid, partnumber, Udate, Ldate)
        ])
        // const flatData = await formatOrderData(data.recordset)
        // const flatData = transformOrderData(data1.recordset,data2.recordsets[1])
        // console.log(data3);

        res.status(200).json({
            Details: data1.recordset,
            Stock: data2.recordsets[1],
            Orders: data3.recordset
        })

    } catch (error) {
        res.status(500).json({
            Error: error.message
        })
    }
    finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('Order Details', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const partStock = async (req, res) => {
    try {
        const { brandid, dealerid, locationid, partnumber, userId } = req.body
        if (!brandid || !dealerid || !locationid || !partnumber || !userId) {
            return res.status(400).json({
                message: `brandid,dealerid,locationid,partnumber and userId are required`
            })
        }
        const check = await partBrandMapping(brandid, partnumber)
        if (check == 0) {
            return res.status(400).json({
                message: `Invalid Partnumber`
            })
        }
        const t = () => performance.now();
        const times = [];

        const s1 = t(); const p1 = partInfo(brandid, partnumber).finally(() => times.push({ label: 'partInfo', ms: +(t() - s1).toFixed(2) }));
        const s2 = t(); const p2 = reservedForVehicle(dealerid, locationid, partnumber).finally(() => times.push({ label: 'reservedForVehicle', ms: +(t() - s2).toFixed(2) }));
        const s3 = t(); const p3 = groupStock(brandid, dealerid, locationid, partnumber).finally(() => times.push({ label: 'groupStock', ms: +(t() - s3).toFixed(2) }));
        const s4 = t(); const p4 = singlePartMaxByLocationService(brandid, dealerid, locationid, partnumber).finally(() => times.push({ label: 'singlePartMaxByLocation', ms: +(t() - s4).toFixed(2) }));

        const [data, data2, data3, data4] = await Promise.all([p1, p2, p3, p4]);

        times.sort((a, b) => b.ms - a.ms);
        // console.table(times);
        // console.log('Slowest:', times[0]);
        // const [data, data2, data3, data4] = await Promise.allSettled([
        //     partInfo(brandid,partnumber),
        //     reservedForVehicle(dealerid, partnumber),
        //     groupStock(brandid,dealerid,locationid, partnumber),
        //     singlePartMaxByLocationService(brandid,dealerid,locationid,partnumber)
        // ]);
        // console.log(`1`,data);
        // console.log(`2`,data2);
        // console.log(`3`,data3);
        // console.log(`4`,data4);

        const colorMap = new Map(
            data3.recordsets[2].map(item => [item.locationid, item.PartStatus])
        );

        // Merge by matching LocationID
        const merged = data3.recordsets[0].map(item => ({
            ...item,
            Partstatus: colorMap.get(item.LocationID) || null
        }));

        // console.log(merged);

        res.status(200).json({
            Details: data.recordset,
            Reserved: data2.recordset,
            Substitutes: data3.recordsets[1],
            Group: merged,
            // StockColor:data3.recordsets[2],
            Norms: data4.recordsets[0],
            Stock: data4.recordsets[1]
        })


    } catch (error) {
        await ErrorLog("Part Stock Check",error.message,req.body.userId)
        res.status(500).json({
            Error: error.message
        })
    }
    finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('Part Stock Check', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const vehicleSearch = async (req, res) => {
    try {
        // const pool = await getPool()
        const { dealerid, locationid, vehicleno, alltimestk, filter, issued, pageno, pagesize, userId } = req.body
        const converted = filter === null
            ? null
            : (filter === 'Open' ? 'N' : filter);

        // console.log(dealerid,vehicleno ,alltimestk, converted , issued);
        const check = await vehicledealercheck(vehicleno, dealerid, locationid)
        if (check == 0) {
            return res.status(400).json({
                message: `Invalid Vehicle Number`
            })
        }
        const [data1, data2, data3] = await Promise.all([
            vehicleSearchService(dealerid, locationid, vehicleno, alltimestk, converted, issued, pageno, pagesize),
            vehicleScore(dealerid, locationid, vehicleno),
            //  vehicleSearchPagination(pageno,pagesize,dealerid,vehicleno,alltimestk,issued,converted)
        ])

        function transformJobCardsArray(jobCards) {
            if (!Array.isArray(jobCards) || jobCards.length === 0) {
                return [{ Count: 0 }, []];
            }

            // Count is constant, so we just take it from the first row
            const count = jobCards[0].Count;

            // Remove Count from each row for the details array
            const details = jobCards.map(({ Count, ...rest }) => rest);

            return [{ Count: count }, details];
        }

        const Data = transformJobCardsArray(data1.recordset)
        // console.log(Data);



        res.status(200).json({
            Data: Data,
            Score: data2.recordset,
            // pageInfo:data3
        })
    } catch (error) {
        await ErrorLog("Vehicle Search",error.message,req.body.userId)
        res.status(500).json(error)
    }finally {
        // console.log("Inside",req.body);
        
        if (req.body.userId) {
            await vehicleSearchlogsService('Vehicle Search', 'Check', req.body, req.body.userId, req.body.locationid)
        }
    }
}

const partSearch = async (req, res) => {
    const { dealerid, jobcardno } = req.body
    const data = await partsByJobCardService(dealerid, jobcardno)
    // const data2 = await partsByJobCard(dealerid,jobcardo)

    res.status(200).json({
        JobCards: data.recordset
    })
}

const substituteParts = async (req, res) => {
    try {
        const { brandid, dealerid, locationid, partnumber, userId } = req.body
        if (!brandid || !partnumber || !userId) {
            return res.status(400).json({
                message: `brandid,partnumber and userId are required`
            })
        }
        const check = await partBrandMapping(brandid, partnumber)
        if (check == 0) {
            return res.status(400).json({
                message: `Invalid Partnumber`
            })
        }
        const [data1, data2] = await Promise.all([
            partSubstituteDetailService(brandid, dealerid, locationid, partnumber),
            partfamilywiseStockColor(brandid, dealerid, locationid, partnumber)
        ])
        const statusMap = {};
        for (const { Part, Partstatus } of data2.recordset) {
            statusMap[Part] = Partstatus;
        }

        // 2️⃣ Enrich each data row with its Partstatus
        const enriched = data1.recordset.map(row => ({
            ...row,
            PartStatus: statusMap[row.PartNumber1] ?? 'Unknown'
        }));

        // 3️⃣ Return the merged array
        return res.status(200).json({ Data: enriched });

        // res.status(200).json({
        //     Data:data.recordset,
        //     Color:color.recordset

        // })
    } catch (error) {
        await ErrorLog("Substitution Check",error.message,req.body.userId)
        res.status(500).json({
            Error: error.message
        })
    } finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('Substitution Check', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }

}

const userRole = async (req, res) => {
    try {
        const { userId } = req.body
        if (!userId) {
            return res.status(400).json({
                message: `userId is required`
            })
        }
        const data = await userroleService(userId)
        // console.log(data.recordset[0].Role);
        res.status(200).json({
            message: data.recordset[0].Role
        })

    } catch (error) {
        res.status(500).json({
            Error: error.message
        })
    }
}

const locationwisePPNIValue = async (req, res) => {
    try {
        const { dealerid, nonstockable, jobcardstatus, month, userId , locationid} = req.body
        if (!dealerid || !nonstockable == null || !jobcardstatus == null || !month == null || !userId) {
            return res.status(400).json({
                message: `dealerid , nonstockable , userId and partstatus is required`
            })
        }
        const data = await locationwisePPNIValueService(dealerid, jobcardstatus, nonstockable, month)

        res.status(200).json({
            Data: data.recordset
        })
    } catch (error) {
        await ErrorLog("LocationWise PPNI",error.message,req.body.userId)
        res.status(500).json({
            Error: error.message
        })
    } finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('LocationWise PPNI', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const advisorwisePPNIValue = async (req, res) => {
    try {
        const { dealerid, locationid, nonstockable, jobcardstatus, month , userId } = req.body
        if (!dealerid || !locationid || !nonstockable == null || !jobcardstatus == null || !month == null || !userId) {
            return res.status(400).json({
                message: `dealerid , nonstockable and partstatus is required`
            })
        }
        const data = await advisorwisePPNIValueService(dealerid, locationid, jobcardstatus, nonstockable, month)
        //    console.log(data);

        res.status(200).json({
            Data: data.recordset
        })
    } catch (error) {
        await ErrorLog("AdvisorWise PPNI",error.message,req.body.userId)
        res.status(500).json({
            Error: error.message
        })
    } finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('AdvisorWise PPNI', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const vehiclewisePPNIValue = async (req, res) => {
    try {
        const { dealerid, locationid, nonstockable, jobcardstatus, advisor, month, pageno, pagesize , userId } = req.body
        if (!dealerid || !locationid || !nonstockable == null || !jobcardstatus == null || !month == null || !userId) {
            return res.status(400).json({
                message: `dealerid , nonstockable and partstatus is required`
            })
        }
        const data = await vehiclewisePPNIValueService(dealerid, locationid, jobcardstatus, nonstockable, advisor, month, pageno, pagesize)
        //    console.log(data);

        // Transform the flat data into grouped vehicle-wise structure
        // function transformVehiclePartsData(rawData) {
        //   const groupedData = {};

        //   // const data = item.TotalCount;

        //   // if (!groupedData[TotalCount]) {
        //   //   groupedData[TotalCount] = {
        //   //     TotalCount: TotalCount,
        //   //     Vehicle:[]
        //   //   }
        //   // }

        //   // // groupedData[vehicle].ppniValue += item.PPNI_Value;
        //   // // groupedData[vehicle].InStockCount = item.InStockCount;
        //   // // groupedData[vehicle].NotIssued = item.NotIssued;

        //   // // groupedData[vehicle].parts.push({
        //   // //   partNumber: item.PartNumber,
        //   // //   description: item.PartDesc,
        //   // //   category: item.part_category,
        //   // //   ndp: item.price,
        //   // //   DemandedQty: item.DemandedQty,
        //   // //   StockQty: item.StockQty,
        //   // //   value: item.PPNI_Value,
        //   // //   alltimestk : item.All_Time_NonStck
        //   // // //   type:item.Partnature
        //   // // });


        //   rawData.forEach(row => {
        //      const key = row.TotalCount;
        //   if (!groupedData[key]) {
        //     groupedData[key] = [];
        //   }
        //   groupedData[key].push({
        //     Vehiclenumber: row.Vehiclenumber,
        //     PPNI_Value: row.PPNI_Value,
        //     NotIssued: row.NotIssued,
        //     InstockCount: row.InstockCount
        //   });
        // });

        // // If you want it as an array of objects:
        // const output = Object.entries(groupedData).map(([totalCount, items]) => ({
        //   TotalCount: Number(totalCount),
        //   Data: items
        // }));

        //   return Object.values(groupedData);
        // }

        function transformVehiclePartsData(rawData) {
            if (!Array.isArray(rawData) || rawData.length === 0) {
                return [{ TotalCount: 0 }, []];
            }

            // take the first row's TotalCount (or max if multiple different)
            const totalCount = Math.max(...rawData.map(row => Number(row.TotalCount || 0)));

            // strip TotalCount from each row
            const vehicleList = rawData.map(row => ({
                Vehiclenumber: row.Vehiclenumber,
                DealerID: row.DealerId,
                LocationID: row.LocationId,
                PPNI_Value: row.PPNI_Value,
                NotIssued: row.NotIssued,
                InstockCount: row.InstockCount
            }));

            // return in the desired shape
            return [{ TotalCount: totalCount }, vehicleList];
        }


        const transformedData = transformVehiclePartsData(data.recordset);

        res.status(200).json({
            Data: transformedData
            // Data:data.recordset
        })
    } catch (error) {
        await ErrorLog("VehicleWise PPNI",error.message,req.body.userId)
        res.status(500).json({
            Error: error.message
        })
    } finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('VehicleWise PPNI', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const partwisePPNIValue = async (req, res) => {
    try {
        const { dealerid, locationid, nonstockable, jobcardstatus, advisor, vehicleno, month, userId } = req.body
        if (!dealerid || !locationid || !nonstockable == null || !jobcardstatus == null || !vehicleno || !month == null || !userId) {
            return res.status(400).json({
                message: `dealerid , locationid , userId and vehicleno is required`
            })
        }
        const data = await partwisePPNIValueService(dealerid, locationid, jobcardstatus, nonstockable, advisor, vehicleno, month)
        res.status(200).json({
            Data: data.recordset
        })
    } catch (error) {
        await ErrorLog("PartWise PPNI",error.message,req.body.userId)
        res.status(500).json({
            Error: error.message
        })
    } finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('PartWise PPNI', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const PPNIVALUE12Months = async (req, res) => {
    try {
        const { dealerid, locationid, nonstockable, jobcardstatus, advisor } = req.body
        if (!dealerid || !locationid == null || !nonstockable == null || !jobcardstatus == null || !advisor == null) {
            return res.status(400).json({
                message: `All fields are required`
            })
        }

        const data = await PPNIVALUE12MonthsService(dealerid, locationid, nonstockable, jobcardstatus, advisor)
        res.status(200).json({
            Data: data.recordset
        })
    } catch (error) {
        await ErrorLog("PPNIGraph",error.message,req.body.userId)
        res.status(500).json({
            Error: error.message
        })
    }
    finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('PPNIGraph', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const gainerListing = async (req, res) => {
    try {
        const { dealerid, locationid, partnumber } = req.body
        const data = await gainerListingService(dealerid, locationid, partnumber)
        // console.log(data);
        res.status(200).json({
            Data: data
        })
    }
    catch (error) {
        await ErrorLog("Gainer Listing",error.message,req.body.userId)
        res.status(500).json({
            Error: error.message
        })
    }finally {
        if (req.body.userId) {
            await vehicleSearchlogsService('Gainer Listing', 'Check', req.body, req.body.userId,req.body.locationid)
        }
    }
}

const predictiveVehicleSearch = async (req, res) => {
    const { dealerid, vehicleno } = req.body
    if (!dealerid || !vehicleno) {
        return res.status(400).json({ message: `dealerid and vehicleno both are required` })
    }
    const data = await predictiveVehicleSearchService(dealerid, vehicleno)
    res.status(200).json({ Data: data })
}

const vehicleSearchLogs = async (req, res) => {
    try {
        const { moduleName, event, details, userid } = req.body
        const result = await vehicleSearchlogsService(moduleName, event, details, userid)
        res.status(200).send({ Data: result.recordset })

    } catch (error) {
        res.status(500).json({ Error: error.message })
    }

}

const viewLog = async (req, res) => {
    try {
        const { type, partnumber, vehiclenumber, from, to } = req.body
        const result = await viewLogService(type, partnumber, vehiclenumber, from, to)
        res.status(200).json({ Data: result.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}

const vehicleSearchConsent = async (req, res) => {
    try {
        const { vehiclenumber, dealerid, locationid, userId } = req.body
        if (!vehiclenumber || !dealerid || !locationid || !userId) {
            return res.status(400).json(new ApiError(400, `vehiclenumber , dealerid , locationid , userId is Required`, [], ``))
        }
        const result = await vehicleSearchConsentService(vehiclenumber, dealerid, locationid, userId)

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json(new ApiResponse(204, [], 'Consent Recorded Successfully'))
        }
        res.status(500).json(new ApiError(500, 'Unable to Record the Consent', [], ''))
    }
    catch (error) {
        res.status(500).json(new ApiError(500, `Unexpected error while recording consent`, []))
    }
}
export { vehicleSearchConsent, gainerListing, partSale, partDetails, singlePartMaxByLocation, orderDetailsByPartnumber, partStock, vehicleSearch, partSearch, substituteParts, userRole, locationwisePPNIValue, advisorwisePPNIValue, vehiclewisePPNIValue, partwisePPNIValue, PPNIVALUE12Months, predictiveVehicleSearch, vehicleSearchLogs, viewLog }