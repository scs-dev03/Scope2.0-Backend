import { getPool2 } from "../../db/db.js"
import moment from 'moment-timezone';
export const addMapping=async (req,res)=>{

    try{
    //    let stockType=req.stockType;
    //    let  brandColumns=JSON.stringify(req.brandColumns);
    //    let  brandId=req.brandId;
    //    let  userId=req.userId;
    //    let partNumber=req.values.partNumber;
    //    let location=req.values.location;
    //    let stockQty=req.values.stockQty;
      const pool=await getPool2();
      let query=`use [z_scope] Insert into Stock_Upload_Mapping(part_number,stock_qty,loc,added_by,brand_id,stock_type,brandColumns,operation,calculativeField) 
      output inserted.id
       values(@partNumber,@stockQty,@location,@userId,@brandId,@stockType,@brandColumns,'create',@calculativeField)`;
   //  console.log("stock qty ",JSON.stringify(req.values.stockQty),req.calculativeField)
     const result= await pool.request()
     .input('partNumber',req.values.partNumber)
     .input('stockQty',req.values.stockQty.join(','))
     .input('location',req.values.location)
     .input('userId',req.userId)
     .input('brandId',req.brandId)
     .input('calculativeField',req.calculativeField)
     .input('brandColumns',JSON.stringify(req.brandColumns))
     .input('stockType',req.stockType)
      .query(query);

      let insertedId=result.recordset[0]?.id;
    //   console.log("result ",result,insertedId)
      let logQuery=`use [z_scope] Insert into Stock_Upload_Logs(added_by,operation_type,part_number,stock_qty,location,calculativeField) 
      values(@userId,'create stock upload mapping',@partNumber,@stockQty,@location,@calculativeField)`
    await pool.request()
    .input('userId',req.userId)
    .input('partNumber',req.values.partNumber)
    .input('stockQty',req.values.stockQty.join(','))
    .input('location',req.values.location)
    .input('calculativeField',req.calculativeField)
    .query(logQuery);


    }
    catch(error){
        console.log("error in add mapping in service ",error.message)
     return error 
    }
}

export const viewMapping=async (req,res)=>{
    try{
        const pool=await getPool2();
        let brandId=req.brand_id;
        let query='use [z_scope] Select * from Stock_Upload_Mapping where brand_id=@brandId';
        const result=await pool.request().input('brandId',brandId).query(query);
  
        return result.recordset;
      }
      catch(error){
          console.log("error in view mapping in service ",error.message)
       return error 
      }
}

export const editMapping=async(req,res)=>{
    try{
        const currentDateInIST = moment.tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss');
       const pool=await getPool2();
       let query=`use [z_scope] Update Stock_Upload_Mapping set 
       part_number=@partNumber,
       stock_qty=@stockQty,
       loc=@location,
       added_by=@userId,
       brand_id=@brandId,
       stock_type=@stockType,
       brandColumns=@brandColumns,
       calculativeField=@calculativeField,
       added_on=@currentDateInIST,
       operation='update'

       where id=@mappedId
        `;
 
       
      const result= await pool.request()
       .input('partNumber',req.values.partNumber)
       .input('stockQty',req.values.stockQty.join(','))
       .input('location',req.values.location)
       .input('userId',req.userId)
       .input('brandId',req.brandId)
       .input('brandColumns',JSON.stringify(req.brandColumns))
       .input('stockType',req.stockType)
       .input('mappedId',req.id)
       .input('calculativeField',req?.calculativeField)
       .input('currentDateInIST',currentDateInIST)
       .query(query);
 
      
       let logQuery=`use [z_scope] Insert into Stock_Upload_Logs(added_by,operation_type,part_number,stock_qty,location,calculativeField)
        values(@userId,'update stock upload mapping',@partNumber,@stockQty,@location,@calculativeField)`
     await pool.request()
     .input('userId',req.userId)
     .input('partNumber',req.values.partNumber)
    .input('stockQty',req.values.stockQty.join(','))
    .input('location',req.values.location)
    .input('calculativeField',req.calculativeField)
     .query(logQuery);
 
      }
      catch(error){
          console.log("error in edit mapping in service ",error.message)
       return error 
      }
}

export const alreadyExistedMapping=async(req,res)=>{
    try{
        const pool=await getPool2();
        let query =`use [z_scope] select * from stock_upload_mapping`;
        const result =await pool.request().query(query);
  
        return result.recordset;
  
      }
      catch(error){
          console.log("error in already existed mapping in service ",error.message)
       return error 
      }
}