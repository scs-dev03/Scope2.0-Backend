import { getLocalIp, getPublicIp, getClientIp } from '../getIP.js';
import path from "path";
import AdmZip from "adm-zip";
import xlsx from "xlsx";
import fs from "fs";
import { getPool1 } from "../../db/db.js";


 const createRole =async function (req) {
    try {
      let userId = req.userId;
      let roleName = req.rolename;
      let GAINER = req.GAINER;
      let SIMS = req.SIMS;
      let AUDIT = req.AUDIT;
      let HR = req.HR;
      let OTHER = req.OTHERS;
      let IT = req.IT;
      let token = req.token;
      let modules = req.modules;

      const pool = await getPool1()
      const clientIp = getClientIp(req);
      const localIp = getLocalIp();

      let publicIp = "Fetching public IP...";
      publicIp = await getPublicIp();
      // console.log("public ip ", publicIp);
      //console.log("modules ",modules[0].submodules)
      let query = `use [z_scope] Insert into role_module_master(role_name,createdby,status,createdon
            ,SIMS
            ,AUDIT
            ,GAINER
            ,IT
            ,HR
            ,OTHER) output inserted.id values(@roleName,@userId,1,getDate(),@SIMS,@AUDIT,@GAINER,@IT,@HR,@OTHER)`;
      const result = await pool
        .request()
        .input("roleName", roleName)
        .input("userId", userId)
        .input("SIMS", SIMS)
        .input("AUDIT", AUDIT)
        .input("GAINER", GAINER)
        .input("IT", IT)
        .input("HR", HR)
        .input("OTHER", OTHER)
        .query(query);
      let insertedId = result.recordset[0].id;
      // console.log("insertedId ",insertedId)
      for (let item of modules) {
        for (let submodule of item.submodules) {
          let pageId = submodule.id;
          let parentId = submodule.parentId;
          let view1 = submodule.view1;
          let add1 = submodule.add1;
          let edit1 = submodule.edit1;
          let delete1 = submodule.delete1;

          //console.log("page id ",pageId,parentId)
          let query3 = `use [z_scope] Insert into role_module_mapping(role_id,module_id,view1,edit1,add1,delete1,moduleParentId) values(@insertedId,@pageId,
                    @view1,@edit1,@add1,@delete1,@parentId)`;

          await pool
            .request()
            .input("insertedId", insertedId)
            .input("pageId", pageId)
            .input("view1", view1)
            .input("edit1", edit1)
            .input("add1", add1)
            .input("delete1", delete1)
            .input("parentId", parentId)
            .query(query3);

        //  console.log("inseerted id ",insertedId)

          let query2 = ` Insert into [${process.env.Live_IP}].[UAD_BI_LEAD_TIME].[dbo].[Audit_log](roleName,userID,status
                    ,SIMS
                    ,AUDIT
                    ,GAINER
                    ,IT
                    ,HR
                    ,OTHERS,IP,token,operation,moduleParentId,pageId,roleId) values(@roleName,@userId,1,@SIMS,@AUDIT,@GAINER,@IT,@HR,@OTHER, @publicIp,@token,
                    'role creation',@parentId,@pageId,@insertedId)`;

          await pool
            .request()
            .input("roleName", roleName)
            .input("userId", userId)
            .input("SIMS", SIMS)
            .input("AUDIT", AUDIT)
            .input("GAINER", GAINER)
            .input("IT", IT)
            .input("HR", HR)
            .input("OTHER", OTHER)
            .input("publicIp", publicIp)
            .input("token", token)
            .input("parentId", parentId)
            .input("pageId", pageId)
            .input("insertedId", insertedId)
            .query(query2);
        }
      }
      // console.log(IT,SIMS,AUDIT,GAINER,OTHER,HR)
    } catch (error) {
      console.log("error in role service ", error.message);
      //res.send({error:'error.message'});
      return error;
    }
  }

  const viewRole= async function (req, res) {
    try {
      const pool = await getPool1()

      let query = `use [z_scope] Select id,role_name as name,sims,hr,audit,gainer,it,other,status from role_module_master `;

      let result = await pool.request().query(query);

      return result.recordset;
    } catch (error) {
      console.log("error in  role service for view ", error.message);
      return error;
    }
  }

  const editRole =async function (req) {
    try {
      let id = req.roleId;
      let userId = req.userId;
      let roleId = req.roleId;
      let roleName = req.name;
      let GAINER = req.verticals.gainer;
      let SIMS = req.verticals.sims;
      let AUDIT = req.verticals.audit;
      let HR = req.verticals.hr;
      let OTHER = req.verticals.other;
      let IT = req.verticals.it;
      let token = req.token;
      let modules = req.modules;
      let status = req.status;
      //console.log("modules",SIMS,AUDIT,HR,OTHER,IT)

      if (!GAINER) {
        GAINER = false;
      }
      if (!SIMS) {
        SIMS = false;
      }
      if (!AUDIT) {
        AUDIT = false;
      }
      if (!HR) {
        HR = false;
      }
      if (!OTHER) {
        OTHER = false;
      }
      if (!IT) {
        IT = false;
      }
      //console.log("role ",OTHER,GAINER,HR,IT,AUDIT,SIMS)
      // let status=req.status;
      // console.log(IT,SIMS,AUDIT,GAINER,OTHER,HR)
      const pool = await getPool1()
      const clientIp = getClientIp(req);
      const localIp = getLocalIp();
      let moduleIds = [];
      let publicIp = "Fetching public IP...";
      publicIp = await getPublicIp();
      // console.log("public ip ", publicIp);
      let bitStatus;
      let query = `use [z_scope] UPDATE role_module_master 
                SET 
                    createdby = @userId, 
                    status = @bitStatus,
                    SIMS = @SIMS, 
                    AUDIT = @AUDIT, 
                    GAINER = @GAINER, 
                    IT = @IT, 
                    HR = @HR, 
                    OTHER = @OTHER             
                WHERE id = @id`;
      // status=@status
      if (status == "Active") {
        bitStatus = 1;
      } else {
        bitStatus = 0;
      }
      //console.log( status, userId, SIMS, AUDIT, GAINER, IT, HR, OTHER, id);
      await pool
        .request()
        .input("bitStatus", bitStatus)
        .input("userId", userId)
        .input("SIMS", SIMS)
        .input("AUDIT", AUDIT)
        .input("GAINER", GAINER)
        .input("IT", IT)
        .input("HR", HR)
        .input("OTHER", OTHER)
        .input("id", id)
        .query(query);
      //console.log("executed successfully")

      let query3 = `use [z_scope] Select module_id ,moduleParentId from role_module_mapping where role_id=@roleId`;

      let resultQuery = await pool
        .request()
        .input("roleId", roleId)
        .query(query3);

      let query34 = "";
    //  console.log("result ---------",resultQuery)
      resultQuery = resultQuery.recordset.map((module) => {
        return {
          ...module, // Spread the existing module properties
          isUpdated: false, // Add the new field with default value false
        };
      });
    //  console.log("modeules" ,modules)
      // for (let item of modules) {
        for (let submodule of modules) {
          //console.log("submodule",submodule)
          let pageId = submodule.id;
          let parentId = submodule.parentId;
          let view1 = submodule.view1;
          let add1 = submodule.add1;
          let edit1 = submodule.edit1;
          let delete1 = submodule.delete1;
         // console.log(pageId,parentId,view1,add1,edit1,delete1)
          //moduleIds.push(pageId);
          const existingModuleIndex = resultQuery.findIndex(
            (module) => module.module_id === pageId
          );
          //console.log("existing index ",existingModuleIndex)
          if (existingModuleIndex == -1) {
            query34 = `use [z_scope] Insert into role_module_mapping(role_id,module_id,view1,add1,delete1,edit1,moduleParentId) 
                        values(@roleId,@pageId,@view1,@add1,@delete1,@edit1,@parentId)`;
          } else {
            resultQuery[existingModuleIndex].isUpdated = true;
            query34 = `use [z_scope] Update role_module_mapping 
                                set 
                                view1=@view1,
                                delete1=@delete1,
                                edit1=@edit1,
                                add1=@add1
                                where role_id=@roleId and moduleParentId=@parentId and module_id=@pageId`;
          }
          const res = await pool
            .request()
            .input("roleId", roleId)
            .input("pageId", pageId)
            .input("parentId", parentId)
            .input("view1", view1)
            .input("add1", add1)
            .input("delete1", delete1)
            .input("edit1", edit1)
            .query(query34);
          let query2 = ` Insert into [${process.env.Live_IP}].[UAD_BI_LEAD_TIME].[dbo].[Audit_log](roleName,userID,status
                    ,SIMS
                    ,AUDIT
                    ,GAINER
                    ,IT
                    ,HR
                    ,OTHERS,IP,token,operation,roleId,moduleParentId)values(@roleName,@userId,1,@SIMS,@AUDIT,@GAINER,@IT,@HR,@OTHER, @publicIp,@token,'update role',@roleId,@parentId)`;

          await pool
            .request()
            .input("roleName", roleName)
            .input("userId", userId)
            .input("SIMS", SIMS)
            .input("AUDIT", AUDIT)
            .input("GAINER", GAINER)
            .input("IT", IT)
            .input("HR", HR)
            .input("OTHER", OTHER)
            .input("publicIp", publicIp)
            .input("token", token)
            .input("roleId", roleId)
            .input("parentId", parentId)
            .query(query2);
          // console.log("res ",res)
        }
     // }
      if (resultQuery.length > 0) {
        let modulesNotUpdated = resultQuery.filter(
          (module) => module.isUpdated === false
        ); // Filter out modules where isUpdated is false
        // .map(module => module.module_id);

        if (modulesNotUpdated.length>0) {
          // console.log("Modules not updated ",modulesNotUpdated)

        let   view1 = 0;
          let delete1 = 0;
          let add1 = 0;
          let edit1 = 0;
          let pageId = modulesNotUpdated[0]?.module_id;
         // console.log("pageId",pageId,modulesNotUpdated)
          let moduleParentId1 = modulesNotUpdated[0].moduleParentId;
          // console.log(pageId,moduleParentId1)
          let query23 = `use [z_scope] Update role_module_mapping 
                                        set 
                                        view1=@view1,
                                        delete1=@delete1,
                                        edit1=@edit1,
                                        add1=@add1
                                        where role_id=@roleId and moduleParentId=@moduleParentId1 and module_id=@pageId`;

          await pool
            .request()
            .input("roleId", roleId)
            .input("pageId", pageId)
            .input("moduleParentId1", moduleParentId1)
            .input("view1", view1)
            .input("add1", add1)
            .input("delete1", delete1)
            .input("edit1", edit1)
            .query(query23);
        }
      }
    } catch (error) {
      console.log("error in role service ", error.message);
      // res.send({error:'error.message',error});
      return error;
    }
  }

  const deleteRole= async function (req, res) {
    try {
      let userId = req.loginUserId;
      let id = req.id;
      //console.log(req,id)
      let status = req.status;
      let token = req.token;
      let query = "";
      let clientIp = getClientIp(req);
      let localIp = getLocalIp();

      let publicIp = "Fetching public IP...";
      publicIp = await getPublicIp();
      const pool = await getPool1()
      if (req.status == "Active") {
        status = 1;
      } else {
        status = 0;
      }
      // if(status=='Inactive' || status=='inactive'){
      query = `use [z_scope] Update role_module_master set status=@status where id=@id`;
      // }
      // else{
      // query=`Update [user] set status='Active' where userId=@id`
      //}
      const result = await pool
        .request()
        .input("id", id)
        .input("status", status)
        .query(query);
      let query2 = "";
      // console.log("----------",result)
      if (status == "Inactive" || status == "inactive") {
        query2 = ` Insert into [${process.env.Live_IP}].[UAD_BI_LEAD_TIME].[dbo].[Audit_log](userID,operation,IP,token,status,roleId) values(@userId,'delete user',@publicIp,@token,0,@id)`;
      } else {
        query2 = ` Insert into [${process.env.Live_IP}].[UAD_BI_LEAD_TIME].[dbo].[Audit_log](userID,operation,IP,token,status,roleId) values(@userId,'delete user',@publicIp,@token,1,@id)`;
      }

      await pool
        .request()
        .input("userId", userId)
        .input("publicIp", publicIp)
        .input("token", token)
        .input("id", id)
        .query(query2);
      return;
    } catch (error) {
      console.log("error in delete user service ", error.message);
      return error;
    }
  }

  const downloadRoleFormat = async function (req, res) {
    try {
      const pool = await getPool1()
      let vertical_ids = req.vertical_ids;
      // console.log("verticalid ", typeof vertical_ids,vertical_ids);

      // Ensure vertical_ids is an array of integers
      if (Array.isArray(vertical_ids) && vertical_ids.length > 0) {
        // Convert the array of ids to a comma-separated string
        const verticalIdsString = vertical_ids.join(",");

        const query = `use [z_scope] SELECT * FROM module_master WHERE business_vertical_id IN (${verticalIdsString})`;
        const data = await pool.request().query(query);
        const map = {};
        const result = [];

        // Step 2: Organize data into a hierarchy
        data.forEach((item) => {
          map[item.id] = { ...item, submodules: [] };
        });

        // Step 3: Organize submodules under their parent module
        data.forEach((item) => {
          if (item.parentId === 0) {
            // Top-level module
            result.push(map[item.id]);
          } else {
            // Submodule, add to parent module's submodules array
            map[item.parentId].submodules.push(map[item.id]);
          }
        });

        // Print the result as a JSON object
        console.log(JSON.stringify(result, null, 2));
        //  const flattenedData = await flattenData(data);
        //  console.log(flattenData)
        // Create a new workbook
        const wb = xlsx.utils.book_new();

        // Convert the flattened data into a worksheet
        const ws = xlsx.utils.json_to_sheet(flattenedData);

        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(wb, ws, "Modules");

        const baseFolderPath = path.join(__dirname);
        const filePaths = path.join(
          baseFolderPath,
          "Role-Access-Format",
          "Access-Settings-Format.xlsx"
        );

        // Ensure the directory exists
        if (!fs.existsSync(path.dirname(filePaths))) {
          fs.mkdirSync(path.dirname(filePaths), { recursive: true });
        }

        // Write the Excel file to the specified location
        xlsx.writeFile(wb, filePaths);

        // Log the file path
        //console.log(`Excel file has been written to: ${filePaths}`);

        // Create a new zip file
        const zip = new AdmZip();

        // Add the Excel file to the zip file
        zip.addLocalFile(filePaths);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", "attachment; filename=files.zip");
        // console.log(zip)
        // Send the zip buffer as the response
        return zip.toBuffer();
      } else {
        console.log("error in fucntion get access setting based on bvid");
      }
    } catch (error) {
      console.log("error in role based service in download role format 454", error);
      return error 
    }
  }

 const uploadRoleFormat=async function (req, filePath) {
    req = JSON.parse(req);
    // console.log("req ",req);
    try {
      const excelData = await readExcelFile(filePath);
      const pool = await getPool1()
      // console.log("head row ",excelData);

      let userId = req["userId"];
      let roleName = req["rolename"];
      let GAINER = req["GAINER"];
      let SIMS = req["SIMS"];
      let AUDIT = req["AUDIT"];
      let HR = req["HR"];
      let OTHER = req["OTHERS"];
      let IT = req["IT"];
      let token = req["token"];
      // console.log("gainer ",GAINER,roleName,SIMS,AUDIT,OTHER,HR,IT)
      if (!GAINER) {
        GAINER = false;
      }
      if (!SIMS) {
        SIMS = false;
      }
      if (!AUDIT) {
        AUDIT = false;
      }
      if (!HR) {
        HR = false;
      }
      if (!OTHER) {
        OTHER = false;
      }
      if (!IT) {
        IT = false;
      }
      const clientIp = getClientIp(req);
      const localIp = getLocalIp();

      let publicIp = "Fetching public IP...";
      publicIp = await getPublicIp();
      let query4 = `use [z_scope] Insert into role_module_master(role_name,createdby,status
          ,SIMS
          ,AUDIT
          ,GAINER
          ,IT
          ,HR
          ,OTHER) output inserted.id values(@roleName,@userId,1,@SIMS,@AUDIT,@GAINER,@IT,@HR,@OTHER)`;
      const result = await pool
        .request()
        .input("roleName", roleName)
        .input("userId", userId)
        .input("SIMS", SIMS)
        .input("AUDIT", AUDIT)
        .input("GAINER", GAINER)
        .input("IT", IT)
        .input("HR", HR)
        .input("OTHER", OTHER)
        .query(query4);
      let insertedId = result[0].id;
      // console.log("inserted id ",insertedId);
      isWrongFile=false;
      for (let item of excelData) {
        
        if(!item["module name"]){
            isWrongFile=true;
            return isWrongFile
        }
        if (item["module name"] == "" ) {
            console.log("Not avilable")
          break;
        }
        let businessVertical = item["business vertical"];
        let moduleName = item["module name"];
        let subModule = item["sub module"];
        let view1;
        if (item["view"] == "Y" || item["view"] == "y") {
          view1 = true;
        } else {
          view1 = false;
        }
        let delete1;
        if (item["delete"] == "Y" || item["delete"] == "y") {
          delete1 = true;
        } else {
          delete1 = false;
        }
        let edit1;
        if (item["edit"] == "Y" || item["edit"] == "y") {
          edit1 = true;
        } else {
          edit1 = false;
        }
        let add1;
        if (item["add"] == "Y" || item["add"] == "y") {
          add1 = true;
        } else {
          add1 = false;
        }
        let getParentIdQuery = `use [z_scope] select parentId from module_master where module_name=@subModule`;
        let result = await pool
          .request()
          .input("subModule", subModule)
          .query(getParentIdQuery);
        let parentId = result[0].parentId;
        // console.log("parentId ",parentId);

        let query = `use [z_scope] select  bv.id as businessVerticalId ,mm.id as pageId  from module_master mm join business_vertical_master bv
            on mm.business_vertical_id=bv.id where bv.business_vertical=@businessVertical and mm.module_name=@subModule`;

        const res1 = await pool
          .request()
          .input("businessVertical", businessVertical)
          .input("subModule", subModule)
          .query(query);
        let businessVerticalId = res1[0].businessVerticalId;
        let pageId = res1[0].pageId;

        // console.log("business vertical id ",businessVerticalId);

        let query3 = `use [z_scope] Insert into role_module_mapping(role_id,module_id,view1,edit1,add1,delete1,moduleParentId) values(@insertedId,@pageId,
            @view1,@edit1,@add1,@delete1,@parentId)`;

        await pool
          .request()
          .input("insertedId", insertedId)
          .input("pageId", pageId)
          .input("view1", view1)
          .input("edit1", edit1)
          .input("add1", add1)
          .input("delete1", delete1)
          .input("parentId", parentId)
          .query(query3);

        let query234 = ` Insert into [${process.env.Live_IP}].[UAD_BI_LEAD_TIME].[dbo].[Audit_log](roleName,userID,status
               ,SIMS
               ,AUDIT
               ,GAINER
               ,IT
               ,HR
               ,OTHERS,IP,token,operation,moduleParentId,pageId,roleId) values(@roleName,@userId,1,@SIMS,@AUDIT,@GAINER,@IT,@HR,@OTHER, @publicIp,@token,
               'role creation through upload',@parentId,@pageId,@insertedId)`;

        await pool
          .request()
          .input("roleName", roleName)
          .input("userId", userId)
          .input("SIMS", SIMS)
          .input("AUDIT", AUDIT)
          .input("GAINER", GAINER)
          .input("IT", IT)
          .input("HR", HR)
          .input("OTHER", OTHER)
          .input("publicIp", publicIp)
          .input("token", token)
          .input("parentId", parentId)
          .input("pageId", pageId)
          .input("insertedId", insertedId)
          .query(query234);
      }
    } catch (error) {
      console.log("error in create role thorugh uploading ", error.message);
      return error
    }
  }

 const getAccessSettingsBasedOnRole= async function (req) {
    try {
      const pool = await getPool1()
      let vertical_ids = req.vertical_ids;
      // console.log("verticalid ", typeof vertical_ids[0]);

      // Ensure vertical_ids is an array of integers
      if (Array.isArray(vertical_ids) && vertical_ids.length > 0) {
        // Convert the array of ids to a comma-separated string
        const verticalIdsString = vertical_ids.join(",");

        const query = `use [z_scope] SELECT * FROM module_master WHERE business_vertical_id IN (${verticalIdsString})`;
        const result = await pool.request().query(query);
        return result.recordset;
      } else {
        console.log("error in fucntion get access setting based on bvid");
      }
    } catch (error) {
      console.log("errror in role service ", error.message);
      return error;
    }
  }

 const getEditAccessSettingsBasedOnRole= async function (req) {
    try {
      const pool = await getPool1();
      let vertical_ids = req.vertical_ids;
      let roleId = req.roleId;
      // console.log("verticalid ", typeof vertical_ids[0]);

      // Ensure vertical_ids is an array of integers
      if (Array.isArray(vertical_ids) && vertical_ids.length > 0) {
        // Convert the array of ids to a comma-separated string
        const verticalIdsString = vertical_ids.join(",");

        const query = `use [z_scope] SELECT * FROM module_master WHERE business_vertical_id IN (${verticalIdsString})`;
        const result1 = await pool.request().query(query);
        //console.log("resul1 ",result1);
        let query1 = `
              use [z_scope]  select mm.module_name, mm.parentId, rmm.view1, rmm.edit1, rmm.add1, rmm.delete1
                from role_module_master rm
                join role_module_mapping rmm on rmm.role_id = rm.id
                join module_master mm on mm.id = rmm.module_id
                where mm.business_vertical_id in (${verticalIdsString})
                and rm.id = @roleId;
    `;

        const result = await pool
          .request()
          .input("roleId", roleId)
          .query(query1);
        // console.log("result",result)
        const mergedResult = result1.recordset.map((item1) => {
          const updatedItem = result.recordset.find(
            (item2) => item2.module_name === item1.module_name
          );

          if (updatedItem) {
            return {
              ...item1,
              view1:
                updatedItem.view1 !== undefined ? updatedItem.view1 : false,
              edit1: updatedItem.edit1 !== undefined ? updatedItem.edit1 : false,
              add1: updatedItem.add1 !== undefined ? updatedItem.add1 : false,
              delete1:
                updatedItem.delete1 !== undefined ? updatedItem.delete1 : false,
            };
          }

          return {
            ...item1,
            view1: false,
            edit1: false,
            add1: false,
            delete1: false,
          };
        });

        //console.log(mergedResult);

        // console.log(mergedResult);
        return mergedResult;
      } else {
        console.log("error in function get access setting based on bvid");
      }
    } catch (error) {
      console.log("errror in edit get access role service ", error.message);
      return error;
    }
  }

function readExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath); // Replace 'your-file.xlsx' with your actual file path
  const sheetName = workbook.SheetNames[0]; // Assuming you want the first sheet
  const sheet = workbook.Sheets[sheetName];

  // Convert the sheet to JSON
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Get raw rows as an array

  // Convert to desired format (Objects)
  const headers = rows[0].map((header) => header.toLowerCase()); // First row contains headers
  const data = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || ""; // Use empty string if no data
    });
    return obj;
  });
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
    } else {
      console.log('File deleted successfully!');
    }
  });
  // Output the result (or save it to a file)
  //console.log(JSON.stringify(data, null, 2));
  return data;
}

export {getAccessSettingsBasedOnRole,getEditAccessSettingsBasedOnRole,createRole,editRole,deleteRole,
  uploadRoleFormat,downloadRoleFormat,viewRole}
