import { getPool } from "../../../db/db.js";
import sql from 'mssql'
import { getLrNumber, isTokenValid } from './BigShipHelper.js'

export default async function BigShipLrUpdate(req, res) {
    try {
        const pool = await getPool();

        const query = `
                SELECT 
                (SELECT TokenNo from CompanyMaster where CompanyCode = 10)TokenNo,
				(SELECT TokenDate from CompanyMaster where CompanyCode = 10)TokenDate,
                A.DispatchOrderNo, A.CompanyCode, B.APIURL, B.Username, B.Password , A.Job_ID
				FROM SH_DispatchDetail A (NOLOCK)
				INNER JOIN Lsp_Cred B (NOLOCK)ON A.CompanyCode = B.LspCode AND B.APITYPE = 'GETLR'
				LEFT JOIN SH_BigShipLrCreation C on C.DispatchOrderNo = A.DispatchOrderNo
				INNER JOIN CompanyMaster D (NOLOCK) ON A.CompanyCode = D.CompanyCode
				WHERE A.CompanyCode = 10  AND A.Job_ID IS NOT NULL AND A.BufferAction IN ('Valid', 'Redirect')
				AND C.LRNumber IS NULL and A.JobIDDate >= '2026-09-8'`;

        const result = await pool.request().query(query);

        const rows = result.recordset;
        // console.log(rows);

        if (!rows || rows.length === 0) {
            return res.status(200).json({ success: true, message: "No data" });
        }

        const token = await isTokenValid(rows[0].TokenNo, rows[0].TokenDate, pool);
        // console.log('token',token);

        let successCount = 0;
        let failedCount = 0;

        const processedOrders = [];

        for (const row of rows) {

            const jobId = String(row.Job_ID || "").trim();
            const dispatchOrderNo = String(row.DispatchOrderNo || "").trim();
            const apiUrl = String(row.APIURL || "").trim();

            try {

                if (!jobId) {
                    failedCount++;

                    processedOrders.push({
                        dispatchOrderNo,
                        jobId,
                        success: false,
                        message: "Job ID missing"
                    });

                    continue;
                }

                if (!apiUrl) {
                    failedCount++;

                    processedOrders.push({
                        dispatchOrderNo,
                        jobId,
                        success: false,
                        message: "LABELPRINT API URL missing"
                    });

                    continue;
                }                
                const lrNumber = await getLrNumber(token, apiUrl, jobId);
                // console.log(`lrNumberresponse`,lrNumber);

                if (lrNumber) {
                    await pool
                        .request()
                        .input("LRNumber", sql.NVarChar, lrNumber)
                        .input("DispatchOrderNo", sql.NVarChar, dispatchOrderNo)
                        .query(`
                           IF EXISTS (
                                SELECT 1
                                FROM SH_BigShipLrCreation
                                WHERE DispatchOrderNo = @DispatchOrderNo
                            )
                            BEGIN
                                UPDATE SH_BigShipLrCreation
                                SET  LRNumber = @LRNumber, LRDate = GETDATE()
                                WHERE DispatchOrderNo = @DispatchOrderNo;
                            END
                            ELSE
                            BEGIN
                                INSERT INTO SH_BigShipLrCreation ( DispatchOrderNo, LRNumber, LRDate  , Companycode)
                                VALUES ( @DispatchOrderNo, @LRNumber, GETDATE() ,10);
                            END
                        `);

                    successCount++;

                    processedOrders.push({
                        dispatchOrderNo,
                        jobId,
                        success: true,
                        lrNumber
                    });

                    // console.log(
                    //     `LR Updated: ${dispatchOrderNo} => ${lrNumber}`
                    // );
                }
                else {

                    // await pool
                    //     .request()
                    //     .input("DispatchOrderNo", sql.NVarChar, dispatchOrderNo)
                    //     .query(`IF EXISTS (
                    //             SELECT 1
                    //             FROM SH_BigShipLrCreation
                    //             WHERE DispatchOrderNo = @DispatchOrderNo
                    //         )
                    //         BEGIN UPDATE SH_BigShipLrCreation
                    //             SET FailedReason = 'Not Manifested BY Any Courier'
                    //             WHERE DispatchOrderNo = @DispatchOrderNo;
                    //         END
                    //         ELSE
                    //         BEGIN
                    //             INSERT INTO SH_BigShipLrCreation(DispatchOrderNo,FailedReason)
                    //             VALUES(@DispatchOrderNo,'Not Manifested BY Any Courier');
                    //         END`);
                    await pool
                    .request()
                    .input("DispatchOrderNo", sql.NVarChar, dispatchOrderNo)
                    .input("FailedReason", sql.NVarChar, 'Not Found')
                    .query(`
                            INSERT INTO SH_FAILEDLR
                            (OrderNo,FailedReason,Date )
                            VALUES (@DispatchOrderNo,@FailedReason,GETDATE())
                        `);

                    failedCount++;

                    processedOrders.push({
                        dispatchOrderNo,
                        jobId,
                        success: false,
                        message: "Not Manifested BY Any Courier"
                    });

                    // console.log(
                    //     `No LR found for Job ID: ${jobId}`
                    // );
                }
            }
            catch (rowError) {

                console.error(`Error processing Job ID ${jobId}:`, rowError.response?.data || rowError.message);

                failedCount++;

                let errorMessage =
                    rowError.response?.data ? JSON.stringify(rowError.response.data) : rowError.message;

                if (errorMessage.length > 500) {
                    errorMessage = errorMessage.substring(0, 500);
                }

                // await pool
                //     .request()
                //     .input("DispatchOrderNo",sql.NVarChar,dispatchOrderNo )
                //     .input("FailedReason",sql.NVarChar,errorMessage )
                //     .query(` IF EXISTS (
                //                 SELECT 1
                //                 FROM SH_BigShipLrCreation
                //                 WHERE DispatchOrderNo = @DispatchOrderNo
                //             )
                //             BEGIN
                //                 UPDATE SH_BigShipLrCreation
                //                 SET FailedReason = @FailedReason
                //                 WHERE DispatchOrderNo = @DispatchOrderNo;
                //             END
                //             ELSE
                //             BEGIN
                //                 INSERT INTO SH_BigShipLrCreation(DispatchOrderNo,FailedReason)
                //                 VALUES(@DispatchOrderNo,@FailedReason);
                //             END
                //         `);

                await pool
                    .request()
                    .input("DispatchOrderNo", sql.NVarChar, dispatchOrderNo)
                    .input("FailedReason", sql.NVarChar, errorMessage)
                    .query(`
                            INSERT INTO SH_FAILEDLR
                            (OrderNo,FailedReason,Date)
                            VALUES (@DispatchOrderNo,@FailedReason,GETDATE())
                        `);


                processedOrders.push({
                    dispatchOrderNo,
                    jobId,
                    success: false,
                    message: errorMessage
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "LR processing completed",
            totalOrders: rows.length,
            successCount,
            failedCount,
            orders: processedOrders
        });
    }
    catch (error) {

        console.error("BigShipLrUpdate Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}