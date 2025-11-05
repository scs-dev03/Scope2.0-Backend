import { getPool1 , getPool2} from "../../db/db.js";
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js";
import { login } from "../login/auth.service.js";
import { orderPlaced } from "../../controller/auto-approval/spm-view.js";

const viewPartyService = async (LocationId, Status) => {
  try {
    const pool = await getPool1()
    const query = `use [z_scope] select Id,  PartyName , PartyCode , CreatedAt , Status from AAP_SPMPartyMaster where LocationId = @LocationId and (@Status is NULL OR Status = @Status) Order BY Id Desc `
    const result = await pool.request()
      .input('LocationId', sql.Int, LocationId)
      .input('Status', sql.Bit, Status ?? null).query(query)
    return result.recordset
  }
  catch (error) {
    throw new ApiError(500, error.message, []);

  }
}

const viewAdvisorService = async (LocationId) => {
  try {
    const pool = await getPool1()
    const query = `use [z_scope] select Id, Advisor , PhoneNo , Email , CreatedAt , Status from AAP_SPMAdvisorMaster where LocationId = @LocationId Order By Id Desc`
    const result = await pool.request().input('LocationId', sql.Int, LocationId).query(query)
    return result.recordset
  }
  catch (error) {
    throw new ApiError(500, error.message, []);

  }
}

const updatePartyService = async (Id, PartyName, PartyCode, status) => {
  try {
    const pool = await getPool1();

    const idInt = Number(Id);
    if (!Number.isInteger(idInt)) {
      throw new ApiError(400, 'Invalid Id', []);
    }

    const req = pool.request().input('Id', sql.Int, idInt);
    const setParts = [];

    if (PartyName !== null && PartyName !== undefined) {
      req.input('PartyName', sql.VarChar(30), String(PartyName).trim());
      setParts.push('PartyName = @PartyName');
    }

    if (PartyCode !== null && PartyCode !== undefined) {
      req.input('PartyCode', sql.VarChar(30), String(PartyCode).trim());
      setParts.push('PartyCode = @PartyCode');
    }

    if (status !== null && status !== undefined) {
      req.input('Status', sql.Bit, Number(status) ? 1 : 0);
      setParts.push('Status = @Status');
    }

    if (setParts.length === 0) return 0;

    const query = `
      UPDATE [z_scope].dbo.AAP_SPMPartyMaster WITH (ROWLOCK)
      SET ${setParts.join(', ')}
      WHERE Id = @Id;

      SELECT Id, PartyName, PartyCode, Status
      FROM [z_scope].dbo.AAP_SPMPartyMaster
      WHERE Id = @Id;
    `;

    const result = await req.query(query);

    return {
      updatedCount: result.rowsAffected?.[0] ?? 0,
      updatedRow: result.recordsets?.[1]?.[0] || result.recordset?.[0] || null
    };
  } catch (error) {
    throw new ApiError(500, 'Unable to Update Party', [error.message]);
  }
};

const updateAdvisorService = async (
  { Id, Advisor = null, PhoneNo = null, Email = null, Status = null },
  tableName = 'dbo.AAP_SPMAdvisorMaster'
) => {
  try {
    const pool = await getPool1();

    // --- validate Id ---
    const idInt = Number(Id);
    if (!Number.isInteger(idInt) || idInt <= 0) {
      throw new ApiError(400, 'Invalid Id', []);
    }

    // --- normalize helpers ---
    const normAdvisor = v =>
      v == null ? null : String(v).trim();
    const normPhone = v => {
      if (v == null) return null;
      const s = String(v).replace(/\D+/g, '').trim(); // digits only
      return s; // keep empty string if caller passes "", we only skip null/undefined
    };
    const normEmail = v =>
      v == null ? null : String(v).trim().toLowerCase();

    // --- normalize inputs (null/undefined => skip) ---
    const advisorVal = normAdvisor(Advisor);
    const phoneVal = normPhone(PhoneNo);
    const emailVal = normEmail(Email);

    // Status: if provided (including 0), coerce to BIT 0/1
    const statusProvided = Status !== null && Status !== undefined;
    const statusBit = statusProvided ? (Number(Status) ? 1 : 0) : null;

    // --- build dynamic SET list for only provided (non-null/undefined) fields ---
    const req = pool.request().input('Id', sql.Int, idInt);
    const setParts = [];

    if (Advisor !== null && Advisor !== undefined) {
      req.input('Advisor', sql.VarChar(100), advisorVal);
      setParts.push('Advisor = @Advisor');
    }
    if (PhoneNo !== null && PhoneNo !== undefined) {
      req.input('PhoneNo', sql.VarChar(20), phoneVal);
      setParts.push('PhoneNo = @PhoneNo');
    }
    if (Email !== null && Email !== undefined) {
      req.input('Email', sql.VarChar(320), emailVal);
      setParts.push('Email = @Email');
    }
    if (statusProvided) {
      req.input('Status', sql.Bit, statusBit);
      setParts.push('Status = @Status');
    }

    if (setParts.length === 0) {
      // nothing to update
      return { updatedCount: 0, updatedRow: null };
    }

    const query = `
      UPDATE [z_scope].${tableName} WITH (ROWLOCK)
      SET ${setParts.join(', ')}
      WHERE Id = @Id;

      SELECT Id, LocationId, Advisor, PhoneNo, Email, Status, CreatedBy, CreatedAt
      FROM [z_scope].${tableName}
      WHERE Id = @Id;
    `;

    const result = await req.query(query);

    return {
      updatedCount: result.rowsAffected?.[0] ?? 0,
      updatedRow: result.recordsets?.[1]?.[0] || result.recordset?.[0] || null
    };
  } catch (error) {
    throw new ApiError(500, 'Unable to Update Advisor', [error.message]);
  }
};

const existingPartyNameandCodeService = async (Id) => {
  try {
    const pool = await getPool1()
    const query = `select PartyName , PartyCode from z_scope..AAP_SPMPartyMaster where LocationId = (select LocationId from z_scope..AAP_SPMPartyMaster where Id = @Id) and Id <> @Id`
    const result = await pool.request().input(`Id`, sql.Int, Id).query(query)
    return result.recordset
  } catch (error) {
    throw new ApiError(500, `Failed to get Existing PartyName and Code`, [], error.message)
  }
}

const existingAdvisor = async (Id) => {
  try {
    const pool = await getPool1()
    const query = `select Advisor from AAP_SPMAdvisorMaster where LocationId = (Select LocationId from AAP_SPMAdvisorMaster where Id = @Id) and Id <> @Id 
     select PhoneNo , Email from AAP_SPMAdvisorMaster where Id <> @Id `
    const result = await pool.request().input('Id', sql.Int, Id).query(query)
    // console.log(result.recordset);
    return result.recordsets
  } catch (error) {
    throw new ApiError(400, error.message)
  }
}
// const existingAdvisorDetails = async (Id) => {
//   try {
//     const pool = await getPool1()
//     const query = `select PhoneNo , Email from AAP_SPMAdvisorMaster where LocationId = (Select LocationId from AAP_SPMAdvisorMaster where Id = @Id) and Id <> @Id `
//     const result = await pool.request().input('Id', sql.Int, Id).query(query)
//     // console.log(result.recordset);
//     return result.recordset
//   } catch (error) {
//     throw new ApiError(400, error.message)
//   }
// }

const viewOrderStatusService = async (
  DealerId, LocationIds, RequestType, From, To,
  OrderTypeIds, PartNumbers, VehicleNumbers,
  JobCardNumbers, AdvisorIds, Status
) => {
  try {
    const pool = await getPool1();

    const query = `
        use z_scope
        EXEC dbo.sp_SPMViewOrderStatus_VB
            @DealerID        = ${DealerId},
            @LocationIds     = ${LocationIds},  
            @Type            = ${RequestType},   
            @From            = '${From}',
            @To              = '${To}',
            @OrderTypeIds    = ${OrderTypeIds},
            @PartNumbers     = ${PartNumbers},   
            @VehicleNumber   = ${VehicleNumbers},
            @JobCardNumber   = ${JobCardNumbers},
            @AdvisorIds      = ${AdvisorIds},    
            @Status          = ${Status};        
    `;
    // console.log(query);

    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    console.log(error.message);
    throw new ApiError(500, `Unable to get View Order Status`, [error.message]);
  }
};

const orderPlacedService = async (tableName, bigid, orderPlace, POnumber) => {
  try {
    const pool = await getPool1()
    const query = `use z_scope
      update  ${tableName}
      set orderplace = @OrderPlace , PONumber = @POnumber
      where bigid = @bigid`

    const result = await pool.request()
      .input('OrderPlace', sql.VarChar, orderPlace)
      .input('POnumber', sql.VarChar, POnumber ?? null)
      .input('bigid', sql.Int, bigid)
      .query(query)
    return result
  } catch (error) {
    throw new ApiError(error);

  }

}

const reorderService = async (DealerId, bigid, Remarks) => {
  try {
    const pool = await getPool1()
    const query = `EXEC DBO.USP_OrderStatusReSubmitNT '${bigid}','${Remarks}','${DealerId}'`
    const result = await pool.request().query(query)
    return result
  } catch (error) {
    throw new ApiError(200, error.message);

  }
}

const nonMovingService = async (PartNumber, BrandId , LocationId) => {
  try {
    const pool = await getPool1()
    const query = `use z_scope Select   D.work_location LOCATION,ISNULL(SUM(QTY),0)QTY,C.DISCOUNT,E.vcName as Dealer 
      from CurrentStock1 X1 (NOLOCK) 
      INNER JOIN  CurrentStock2 X2 (NOLOCK) ON(X1.tCode=X2.StockCode) 
      INNER JOIN SH_UPLOADNONMOVINGPART C ON(C.locationid =X1.locationid AND C.PARTNUMBER1=X2.partnumber)   
      INNER JOIN Dealer_Workshop_Master D ON(D.BIGID=X1.locationid)  
      INNER JOIN Dealer_Master E ON(E.BIGID=d.DealerID)  
      WHERE  X2.partnumber='${PartNumber}' AND E.Rstatus=1 AND C.AUTOREMOVAL='N' AND X2.QTY>0 AND D.BRANDID='${BrandId}' AND  X1.locationid!='${LocationId}' 
      GROUP BY D.WORK_LOCATION,C.DISCOUNT,E.vcName`
    const result = await pool.request().query(query)
    // console.log(query);
    
    return result.recordset
  } catch (error) {
    throw new ApiError(500, `Unable to find Non-Moving`, [error.message]);
  }
}
export { viewOrderStatusService, viewPartyService, viewAdvisorService, updatePartyService, updateAdvisorService, existingPartyNameandCodeService, existingAdvisor, orderPlacedService, reorderService ,nonMovingService}