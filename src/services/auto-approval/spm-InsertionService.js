import { getPool1 } from "../../db/db.js";
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js";

const insertApprovals = async(data)=>{
    try{
    const pool = await getPool1()
    const tableName = 'Temp_createorderrequest_VB'
    const table = new sql.Table(tableName); // Use fully qualified name
    table.create = false;
data = data.map((row) => ({
    ...row,
    PartNumber: row.PartNumber ? row.PartNumber.toString() : null, // Ensure PartNumber is a string
    Remarks: row.Remarks ? row.Remarks.toString() : null, // Ensure Remarks is a string
    VehicleNumber: row.VehicleNumber ? row.VehicleNumber.toString() : null, // Ensure VehicleNumber is a string
    VehicleModel: row.VehicleModel ? row.VehicleModel.toString() : null, // Ensure VehicleModel is a string
    JobCardNumber: row.JobCardNumber ? row.JobCardNumber.toString() : null, // Ensure JobCardNumber is a string
    JobType: row.JobType ? row.JobType.toString() : null, // Ensure JobType is a string
    Advisor: row.Advisor ? row.Advisor.toString() : null, // Ensure Advisor is a string
    OrderType: row.OrderType ? row.OrderType.toString() : null, // Ensure OrderType is a string
    // Ensure numeric fields are passed as numbers (no strings)
    LocationId: row.LocationId || null,
    Qty: row.Qty || null,
    PartyId: row.PartyId || null,
    AdvanceValue: row.AdvanceValue || null,
    Estimate: row.Estimate || null,
    UploadedBy: row.UploadedBy || null,
    Type: row.Type || null
}));

    
    // 2) Define the 11 non-default columns, in exact ordinal order & types:
    table.columns.add('LocationId',      sql.Int,             { nullable: true });  
    table.columns.add('PartNumber',      sql.VarChar(50),     { nullable: true });  
    table.columns.add('Qty',             sql.Int,             { nullable: true });  
    table.columns.add('Remarks',         sql.VarChar(100),    { nullable: true });  
    table.columns.add('VehicleNumber',   sql.VarChar(20),     { nullable: true });  
    table.columns.add('VehicleModel',    sql.VarChar(30),     { nullable: true });  
    table.columns.add('JobCardNumber',   sql.VarChar(40),     { nullable: true });  
    table.columns.add('JobType',         sql.VarChar(15),     { nullable: true });  
    table.columns.add('Advisor',         sql.VarChar(20),     { nullable: true });  
    table.columns.add('OrderType',       sql.VarChar(10),     { nullable: true });  
    table.columns.add('PartyId',         sql.Int,             { nullable: true });  
    table.columns.add('AdvanceValue',    sql.Int,             { nullable: true });  
    table.columns.add('Estimate',        sql.Int,             { nullable: true });  
    table.columns.add('UploadedBy',      sql.Int,             { nullable: true });  
    table.columns.add('Type',            sql.VarChar,         { nullable: true });  

    // Add rows to the table for bulk insert
        data.forEach((row) => {
            table.rows.add(
                row.LocationId,
                row.PartNumber,
                row.Qty,
                row.Remarks,
                row.VehicleNumber,
                row.VehicleModel,
                row.JobCardNumber,
                row.JobType,
                row.Advisor,
                row.OrderType,
                row.PartyId,
                row.AdvanceValue,
                row.Estimate,
                row.UploadedBy,
                row.Type
            );
        });

// const request = new sql.Request(transaction); // Use transaction, not pool
const request = pool.request(); // Use transaction, not pool
    await request.bulk(table);
    // await transaction.commit();
    // console.log('Bulk insert successful');
    return

  } catch (err) {
    console.error('Error during bulk insert:', err );
    // await transaction.rollback();
    throw err; // Re-throw for upstream handling
  } 
}

const insertSpmParty = async(data)=>{
try {
        const pool = await getPool1()
        const tableName = 'AAP_SPMPartyMaster'
        const table = new sql.Table(tableName)
        table.create = false;
    
        data = data.map((row) => ({
        ...row,
        PartyName:row.PartyName,
        LocationId:row.LocationId,
        PartyCode:row.PartyCode,
        CreatedBy:row.CreatedBy
        }));

        table.columns.add('LocationId',      sql.Int,             { nullable: false });  
        table.columns.add('PartyName',       sql.VarChar(30),     { nullable: false });  
        table.columns.add('PartyCode',       sql.VarChar(30),     { nullable: false });  
        table.columns.add('CreatedBy',       sql.Int,             { nullable: true });  
        
        data.forEach((row)=>{
            table.rows.add(
                row.LocationId,
                row.PartyCode,
                row.PartyName,
                row.CreatedBy
            )
        })

        const result = await pool.request().bulk(table)
        return
    } catch (error) {
        throw new Error(error.message)    
    }
}

const insertadvisorParty = async(data)=>{
    try{    
    const pool = await getPool1()
    const tableName = 'AAP_SPMAdvisorMaster'
    const table = new sql.Table(tableName)
    table.create = false;
    
        // data = data.map((row) => ({
        // ...row,
        // Advisor:row.Advisor,
        // LocationId:row.LocationId,
        // PhoneNo:row.PhoneNo,
        // Email:row.Email
        // }));

        table.columns.add('LocationId',    sql.Int,             { nullable: false });  
        table.columns.add('Advisor',       sql.VarChar(30),     { nullable: false });  
        table.columns.add('PhoneNo',       sql.VarChar(10),     { nullable: true });  
        table.columns.add('Email',         sql.VarChar(50),     { nullable: true });  
        table.columns.add('CreatedBy',     sql.Int,             { nullable: true });  
        
        const sanitizedData = data.map(row => ({
            LocationId: row.LocationId || null,
            Advisor: row.Advisor ? row.Advisor.toString() : null,
            PhoneNo: row.PhoneNo ? row.PhoneNo.toString() : null,
            Email: row.Email ? row.Email.toString() : null,
            CreatedBy: row.userId || null
        }));
        
        sanitizedData.forEach((row)=>{
            table.rows.add(
                row.LocationId,
                row.Advisor,
                row.PhoneNo,
                row.Email,
                row.CreatedBy
            )
        })
        // console.table(table);
        
        const result = await pool.request().bulk(table)
        return
    } catch (error) {
        const msg = String(error?.message || '');
        if(msg == `Received an invalid column length from the bcp client for colid 3.`)
        {
            throw new Error(`Invalid PhoneNumber`);
        }

       throw new Error(error.message)    
}
}

export {insertApprovals,insertSpmParty , insertadvisorParty}