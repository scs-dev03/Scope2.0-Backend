import axios from "axios";
import { getPool } from "../../../db/db.js";
import sql from 'mssql'
import { ApiError } from "../../../utils/ApiError.js";

export async function getLrNumber(token, apiUrl, masterCustomOrderId) {
    try {
        const response = await axios({
            method: "GET",
            url: apiUrl,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            },
            data: {
                MasterCustomOrderId: masterCustomOrderId
            }
        });
        const apiResponse = response.data;
        // console.log("apiResponse",apiResponse);
        
        if (apiResponse.status_code === 200 && apiResponse.status === true) {
            return apiResponse.data.getOrderDetails.AwbNumber ?? null;
        } else {
            // console.log("API Error:", apiResponse.message);
            return null;
        }

    } catch (error) {
        // console.log("ERROR BLOCK");
        // console.log(error);
        
        if (error.response) {
            const apiResponse = error.response.data;

            if (apiResponse.status_code === 404) {
                console.log("Order not found.");
                throw new ApiError(404,apiResponse.message)
            }
            else if (apiResponse.status_code === 400) {
                console.log("Bad Request:", apiResponse.message);
                throw new ApiError(400,apiResponse.message)
            }
            else if (apiResponse.status_code === 401) {
                console.log("Unauthorized:", apiResponse.message);
                throw new ApiError(401,apiResponse.message)
            }
            else {
                console.log(
                    "BigShip API Error:",
                    apiResponse.status_code,
                    apiResponse.message
                );
                throw new ApiError(500,apiResponse.message)
            }
        }

        console.log("BigShip Error:", error.message);
        throw new ApiError(500,apiResponse.message)
    }
}

export async function generateToken(payload, url) {
    try {
        const response = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });
        return response.data
        
    } catch (error) {
        console.log(`generateToken` , error);
        
       if (error.response) {
            console.log("Status:", error.response.status);
            console.log("API Response:", error.response.data);

            return error.response.data;
        }

        // console.log("Axios Error:", error.message);

        throw error;
    }
    
}

export async function isTokenValid(token, tokenDate, pool) {
    try {
        let isTokenValid = false;

        if (token && tokenDate) {
            const expiryDate = new Date(tokenDate);

            if (!isNaN(expiryDate.getTime())) {
                isTokenValid = expiryDate > new Date();
            }
        }

        if (isTokenValid) {
            return token;
        }

        const result = await pool
            .request()
            .query(`
                SELECT Username,
                       Password,
                       APIURL,
                       AccessKey
                FROM LSP_Cred
                WHERE LSPCode = 10
                  AND APITYPE = 'LOGIN'
            `);

        if (!result.recordset || result.recordset.length === 0) {
            throw new Error("B2B login credentials not found.");
        }

        const creds = result.recordset[0];

        const payload = {
            username: creds.Username,
            password: creds.Password,
            access_key: creds.AccessKey
        };

        const tokenData = await generateToken(
            payload,
            creds.APIURL
        );
        
        if (
            !tokenData ||
            !tokenData.data ||
            !tokenData.data.token
        ) {
            throw new Error(
                "Token API did not return a valid token."
            );
        }

        token = tokenData.data.token;

        const tokenExpiringAt = tokenData.data.tokenExpiringAt;

        // console.log("Token expiry received:", tokenExpiringAt);

        // Convert API date string to JavaScript Date
        const expiryDate = new Date(tokenExpiringAt);

        if (isNaN(expiryDate.getTime())) {
            throw new Error(
                `Invalid token expiry date received: ${tokenExpiringAt}`
            );
        }

        await pool
            .request()
            .input("Token", sql.NVarChar, token)
            .input("TokenDate", sql.DateTime2, expiryDate)
            .query(`
                UPDATE CompanyMaster
                SET TokenNo = @Token,
                    TokenDate = @TokenDate
                WHERE CompanyCode = 10
            `);

        return token;

    } catch (error) {
        console.error(
            "isTokenValidB2B error:",
            error.message
        );

        throw error;
    }
}

export async function getTrackingDetails(token,apiUrl,customGlobalOrderId) {
    try {
        const response = await axios({
            method: "GET",
            url: apiUrl,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            },

            data: {
                CustomGlobalOrderId: customGlobalOrderId
            },
        });
        // console.log(response);
        
        const apiResponse = response.data;

        if (
            apiResponse.status_code === 200 &&
            apiResponse.status === true
        ) {
            return apiResponse;
        }
        else if (apiResponse.status_code === 404) {

            console.log(
                `Tracking not found for order ${customGlobalOrderId}:`,
                apiResponse.message
            );

            return apiResponse;
        }
        else if (apiResponse.status_code === 400) {

            console.log(
                `Bad request for order ${customGlobalOrderId}:`,
                apiResponse.message
            );

            return apiResponse;
        }
        else if (apiResponse.status_code === 401) {

            console.log(
                "Unauthorized:",
                apiResponse.message
            );

            return apiResponse;
        }
        else {

            console.log(
                "BigShip Tracking API Error:",
                apiResponse.status_code,
                apiResponse.message
            );

            return apiResponse;
        }

    }
    catch (error) {

        console.log(
            "BigShip Tracking Error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


export  function utcToIst(dateTime) {
    const date = new Date(dateTime);

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    })
        .format(date)
        .replace(",", "");
}


