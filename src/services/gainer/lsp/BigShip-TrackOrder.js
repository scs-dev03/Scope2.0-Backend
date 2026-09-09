import { getPool } from "../../../db/db.js";
import sql from "mssql";

import {
    isTokenValid,
    getTrackingDetails, utcToIst
} from "./BigShipHelper.js";



export default async function BigShipOrderStatusUpdate(req, res) {

    try {

        const pool = await getPool();

        const query = `
            select A.Job_ID , B.LRnumber LRNumber, A.DispatchOrderNo,
            (Select APIURL from Lsp_Cred where APITYPE = 'LRTRACK'  and LspCode = 10 ) APIURL_Tracking , 
            (Select TokenNo from CompanyMaster where CompanyCode = 10 )TokenNo , 
            (Select TokenDate from CompanyMaster where CompanyCode = 10 )TokenDate 
            from SH_DispatchDetail A
            JOIN SH_BigShipLrCreation B on b.dispatchorderno = A.DispatchOrderNo
            where B.LRnumber IS NOT NULL and A.CompanyCode = 10 and (LSPStatus != 'Delivered' OR LSPStatus IS NULL) AND BufferAction in('Valid','Redirect')
            AND isDeliverByCompany = 'N'
        `;


        const result = await pool
            .request()
            .query(query);


        const rows = result.recordset;


        if (!rows || rows.length === 0) {

            return res.status(200).json({
                success: true,
                message: "No orders found for tracking."
            });
        }


        // ---------------------------------------------
        // VALIDATE / GENERATE TOKEN ONLY ONCE
        // ---------------------------------------------

        const token = await isTokenValid(
            rows[0].TokenNo,
            rows[0].TokenDate,
            pool
        );


        let successCount = 0;
        let failedCount = 0;

        const processedOrders = [];


        // ---------------------------------------------
        // PROCESS ORDERS
        // ---------------------------------------------

        for (const row of rows) {

            const dispatchOrderNo = String(row.DispatchOrderNo || "").trim();

            const jobId = String(row.Job_ID || "").trim();

            const lrNumber = String(row.LRNumber || "").trim();

            const apiUrl = String(row.APIURL_Tracking || "").trim();
            try {

                if (!jobId) {

                    failedCount++;

                    processedOrders.push({
                        dispatchOrderNo,
                        lrNumber,
                        success: false,
                        message: "Job ID missing"
                    });

                    continue;
                }


                if (!lrNumber) {

                    failedCount++;

                    processedOrders.push({
                        dispatchOrderNo,
                        jobId,
                        success: false,
                        message: "LR Number missing"
                    });

                    continue;
                }


                if (!apiUrl) {

                    failedCount++;

                    processedOrders.push({
                        dispatchOrderNo,
                        jobId,
                        success: false,
                        message: "LRTRACK API URL missing"
                    });

                    continue;
                }


                // ---------------------------------------------
                // CALL BIGSHIP TRACK ORDER API
                // ---------------------------------------------
                const trackingResponse =
                    await getTrackingDetails(
                        token,
                        apiUrl,
                        jobId
                    );


                // ---------------------------------------------
                // CHECK API STATUS
                // ---------------------------------------------

                if (trackingResponse && trackingResponse.status === true && trackingResponse.status_code === 200 && trackingResponse.data) {

                    const tracking = trackingResponse.data;
                    // console.log(`tracking`,tracking);

                    // Main/current status
                    const currentTrackingStatus = tracking.order_status || "";

                    const trackingHistories = tracking.checkpoints;

                    // console.log(`trackingHistories`, trackingHistories);

                    let selectedScan = null;


                    // BigShip documentation appears to return
                    // latest tracking first.
                    if (trackingHistories.length > 0) {
                        selectedScan = trackingHistories[0];
                    }

                    // console.log(`selectedScan`, selectedScan);


                    if (!selectedScan) {

                        await pool
                            .request()
                            .input("DispatchOrderNo", sql.NVarChar, dispatchOrderNo)
                            .input("FailedReason", sql.NVarChar, "Tracking history not found"
                            )
                            .query(`
                                UPDATE SH_DispatchDetail SET FailedReason = @FailedReason
                                WHERE DispatchOrderNo = @DispatchOrderNo AND CompanyCode = 10
                            `);
                        failedCount++;


                        processedOrders.push({
                            dispatchOrderNo,
                            jobId,
                            lrNumber,
                            success: false,
                            message:
                                "Tracking history not found"
                        });


                        continue;
                    }


                    // ---------------------------------------------
                    // NEW API FIELD MAPPING
                    // ---------------------------------------------

                    const lspStatus = selectedScan.order_status || selectedScan.tag || "";
                    const lspRemarks = selectedScan.message || "";
                    const checkpointTime = selectedScan.checkpoint_time;


                    let lastScanDate = null;


                    if (checkpointTime) {
                        const parsedDate = new Date(checkpointTime);
                        if (!isNaN(parsedDate.getTime())) {
                            lastScanDate = parsedDate;
                        }
                    }

                    let lastScanLocation = selectedScan.location || "";
                    let pickupDate = null;


                    if (currentTrackingStatus.toLowerCase() === "pickup scheduled") {

                        pickupDate = lastScanDate;
                    }


                    // ---------------------------------------------
                    // UPDATE DATABASE
                    // ---------------------------------------------

                    const request =
                        pool.request();
                        request.input("LRNumber", sql.NVarChar, lrNumber);
                        request.input("LSPStatus", sql.NVarChar, lspStatus);
                        request.input("LSPRemarks", sql.NVarChar, lspRemarks);
                        request.input("LastScanLocation", sql.NVarChar, lastScanLocation);
                        request.input("LastScanDate", sql.DateTime2, utcToIst(lastScanDate));


                    let updateQuery = `

                        UPDATE SH_DispatchDetail
                        SET
                        LSPStatus  = @LSPStatus,
                        LSPRemarks = @LSPRemarks,
                        LastScanLocation = @LastScanLocation,
                        LastScanDate = @LastScanDate

                    `;

                    
                    // ---------------------------------------------
                    // PICKUP DATE
                    // ---------------------------------------------

                    if (pickupDate) {
                        request.input("PickedupDate", sql.DateTime2, utcToIst(pickupDate));
                        
                        updateQuery += `, PickedupDate = @PickedupDate `;
                    }

                    // ---------------------------------------------
                    // DELIVERED
                    // ---------------------------------------------

                    if ( lspStatus.toLowerCase() === "delivered") {
                        console.log(`inside delivered`);
                        
                        request.input("DeliverDate", sql.DateTime2, utcToIst(lastScanDate));
                        
                        updateQuery += `, isDeliverByCompany = 'Y', DeliverDate = @DeliverDate `;
                    }


                    // ---------------------------------------------
                    // LOST
                    // ---------------------------------------------

                    if (lspStatus.toLowerCase() ==="lost") {
                        console.log(`inside lost`);    
                        request.input("DeliverDate",sql.DateTime2,utcToIst(lastScanDate));
                        updateQuery += `, isDeliverByCompany = 'L', DeliverDate = @DeliverDate  `;
                    }

                    // console.log(`dispatchOrderNo`,dispatchOrderNo);

                    request.input("dispatchOrderNo", sql.VarChar, dispatchOrderNo);

                    updateQuery += `WHERE DispatchOrderNo = @dispatchOrderNo AND CompanyCode = 10 `;
                    // console.log(updateQuery);


                    await request.query( updateQuery );


                    successCount++;


                    processedOrders.push({
                        dispatchOrderNo,
                        jobId,
                        lrNumber,
                        success: true,
                        status: lspStatus,
                        remarks: lspRemarks,
                        lastScanDate: lastScanDate,
                        lastScanLocation: lastScanLocation
                    });

                }

                // ---------------------------------------------
                // TRACKING NOT FOUND
                // ---------------------------------------------

                else {

                    let failedReason =
                        trackingResponse?.message ||
                        "Tracking Details Not Found";


                    if ( failedReason.length > 200 ) {failedReason = failedReason.substring(0,500);}


                    await pool
                        .request()
                        .input("LRNumber",sql.NVarChar,lrNumber)
                        .input("FailedReason",sql.NVarChar,failedReason)
                        .query(`UPDATE SH_DispatchDetail
                            SET FailedReason = @FailedReason 
                            WHERE LRNumber = @LRNumber
                            AND CompanyCode = 10
                        `);


                    failedCount++;


                    processedOrders.push({
                        dispatchOrderNo,
                        jobId,
                        lrNumber,
                        success: false,
                        message:failedReason
                    });
                }

            }
            catch (rowError) {

                console.error(  `Tracking error for Job ID ${jobId}:`, rowError.response?.data || rowError.message );


                failedCount++;


                let errorMessage =
                    rowError.response?.data
                        ? JSON.stringify(
                            rowError.response.data
                        )
                        : rowError.message;


                if (
                    errorMessage.length > 500
                ) {
                    errorMessage =
                        errorMessage.substring(
                            0,
                            500
                        );
                }


                await pool
                    .request()
                    .input("LRNumber",sql.NVarChar,lrNumber)
                    .input("FailedReason",sql.NVarChar,errorMessage)
                    .query(`

                        UPDATE SH_DispatchDetail

                        SET FailedReason =
                            @FailedReason

                        WHERE LRNumber =
                            @LRNumber

                          AND CompanyCode = 10
                    `);


                processedOrders.push({
                    dispatchOrderNo,
                    jobId,
                    lrNumber,
                    success: false,
                    message: errorMessage
                });
            }
        }


        // ---------------------------------------------
        // FINAL RESPONSE
        // ---------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "BigShip tracking processing completed",

            totalOrders:
                rows.length,

            successCount,

            failedCount,

            orders:
                processedOrders
        });

    }
    catch (error) {

        console.error(
            "BigShipOrderStatusUpdate Error:",
            error
        );


        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}