import 'dotenv/config'
import { transporter, helpandsupportMail } from '../../utils/mailservice.js'
import { getPool } from '../../db/db.js'
import { uploadToS3 } from '../../middlewares/multer.aws-s3.middleware.js';
import sql from 'mssql'
// const helpsupportApi = async(req,res)=>{
//     try {
//       const pool = await getPool()
//       const {issueid,subissueid, desc , userid , locationid} = req.body

//       if(!issueid || !desc || !userid || !locationid ){
//         return res.status(400).json({message:`All fields are Required`})
//       }
//       try {
//         const query = `INSERT into HelpSupportGainer(Issueid,SubIssueid,Description,UserID,LocationID)
//                       values (${issueid},${subissueid},'${desc}' , ${userid} , ${locationid})`
//         await pool.request().query(query)

//       } catch (error) {
//          return res.status(500).json({Error:error.message})
//       }

//       const query = `select CONCAT(vcFirstName , ' ',vcLastName) as Name , vcEmail from z_scope..adminmaster_gen where bintId_Pk = ${userid} `
//     const result =  await pool.request().query(query)
//     const username = result.recordset[0].Name;
//     const useremail = result.recordset[0].vcEmail

//     const query2 = `select brand , dealer , location from z_scope..locationinfo where locationid = ${locationid}`
//     const locationResult  = await pool.request().query(query2) 
//      const Brand = locationResult.recordset[0].brand;
//      const Dealer = locationResult.recordset[0].dealer;
//      const Location = locationResult.recordset[0].location;

//      const query3 = `select Top 1 hsg.TicketID ,hsg.Addedon ,sm.Service , im.issue  from z_scope..HelpSupportGainer hsg
//                     join z_scope..IssuesMaster im on im.IssueID = hsg.Issueid
//                     join z_scope..ServiceMaster sm on sm.ServiceID = im.VerticalID 
//                     where userid = ${userid} and locationid = ${locationid} order by addedon desc`
//       const TicketResult = await pool.request().query(query3)  
//       const TicketID = TicketResult.recordset[0].TicketID
//       const Service = TicketResult.recordset[0].Service
//       const issue = TicketResult.recordset[0].issue
//       let Datetime = TicketResult.recordset[0].Addedon

//       const { formattedDate, formattedDateTime } = formatUTCDateTime(Datetime);      

//       const mailOptions = {
//           from: process.env.EMAILID,
//           to: 'vishu.bansal@sparecare.in,scope@sparecare.in,gainer.alerts@sparecare.in',useremail,
//           subject: `[Ticket #${TicketID}]: ${Service}_${issue}_${formattedDate}`,
// html: `
//     <p>Hi <strong>${username}</strong>,</p>

//     <p>Thank you for contacting us. This is an automated response confirming the receipt of your ticket. One of our agents will get back to you as soon as possible.</p>

//     <p><strong>Ticket Details:</strong></p>
//     <ul>
//       <li><strong>Ticket ID:</strong> #${TicketID}</li>
//       <li><strong>Ticket Date:</strong> ${formattedDateTime}</li>
//       <li><strong>Service:</strong> ${Service}</li>
//       <li><strong>Brand:</strong> ${Brand}</li>
//       <li><strong>Dealer:</strong> ${Dealer}</li>
//       <li><strong>Location:</strong> ${Location}</li>
//       <li><strong>Issue:</strong> ${issue}</li>
//       <li><strong>Description:</strong> ${desc}</li>
//       <li><strong>Status:</strong> Being Processed</li>
//       <li><strong>Priority:</strong> High</li>
//     </ul>

//     <p>Regards,<br/>Team SpareCare</p>`
//         };

//         transporter.sendMail(mailOptions, (error, info) => {
//           if (error) {
//             console.error('Error sending email:', error);
//             return res.status(500).json({ Error: 'Failed to send Mail.' });
//           }          
//           res.status(200).json({ message: 'Mail sent successfully.'});
//         });
//     } catch (error) {
//       console.log(error.message);

//       res.status(500).json({Error:error.message})
//     }

// }
// function formatUTCDateTime(isoString) {
//   const date = new Date(isoString);

//   const day = String(date.getUTCDate()).padStart(2, '0');
//   const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
//                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//   const month = monthNames[date.getUTCMonth()];
//   const year = date.getUTCFullYear();

//   const hours = String(date.getUTCHours()).padStart(2, '0');
//   const minutes = String(date.getUTCMinutes()).padStart(2, '0');
//   const seconds = String(date.getUTCSeconds()).padStart(2, '0');

//   const formattedDate = `${day}-${month}-${year}`;
//   const formattedDateTime = `${formattedDate} ${hours}:${minutes}:${seconds}`;

//   return { formattedDate, formattedDateTime };
// }
const helpsupportApi = async (req, res) => {
  const pool = await getPool();
  const transaction = await pool.transaction();

  const files = req.files; // array of uploaded files
  const imageUrls = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const url = await uploadToS3(file);
      imageUrls.push(url);
    }
  }

  // You can now use imageUrls[] in your DB insert or email content
  // console.log("Uploaded image URLs:", imageUrls);

  const { issueid, subissueid, desc, userid, locationid } = req.body;


  if (!issueid || !desc || !userid || !locationid) {
    return res.status(400).json({ message: 'All fields are Required' });
  }

  try {
    await transaction.begin(); // start transaction
    const request = transaction.request();

    // 1. Insert into HelpSupportGainer
    // const insertQuery = `
    //   INSERT INTO HelpSupportGainer (Issueid, SubIssueid, Description, UserID, LocationID, imageUrl)
    //   VALUES (${issueid}, ${subissueid}, '${desc}', ${userid}, ${locationid},'${imageUrls}')`;
    // await request.query(insertQuery);
    const insertQuery = `
  INSERT INTO z_scope..HelpSupportGainer (Issueid, SubIssueid, Description, UserID, LocationID, imageUrl)
  VALUES (@issueid, @subissueid, @desc, @userid, @locationid, @imageUrls)
`;

    request.input('issueid', sql.Int, parseInt(issueid));
    request.input('subissueid', sql.Int, subissueid && subissueid !== 'null' ? parseInt(subissueid) : null);
    request.input('desc', sql.VarChar, desc);
    request.input('userid', sql.Int, parseInt(userid));
    request.input('locationid', sql.Int, parseInt(locationid));
    request.input('imageUrls', sql.VarChar, imageUrls.join(', ')); // or JSON.stringify(imageUrls)

    await request.query(insertQuery);

    // 2. Get user info
    const userQuery = `
      SELECT CONCAT(vcFirstName, ' ', vcLastName) AS Name, vcEmail
      FROM z_scope..adminmaster_gen
      WHERE bintId_Pk = ${userid}
    `;
    const userResult = await request.query(userQuery);
    const username = userResult.recordset[0].Name;
    const useremail = userResult.recordset[0].vcEmail;

    // 3. Get location info
    const locationQuery = `
      SELECT brand, dealer, location , BrandId , DealerId , LocationId
      FROM z_scope..locationinfo
      WHERE locationid = ${locationid}
    `;
    const locationResult = await request.query(locationQuery);
    const BrandId = locationResult.recordset[0].BrandId;
    const Brand = locationResult.recordset[0].brand;
    const Dealer = locationResult.recordset[0].dealer;
    const Location = locationResult.recordset[0].location;

    // 4. Get latest ticket info
    const ticketQuery = `
      SELECT TOP 1 hsg.TicketID, hsg.Addedon, sm.Service, im.issue , ISNULL(sim.subissue, 'NOT APPLICABLE') AS subissue
      FROM z_scope..HelpSupportGainer hsg
      JOIN z_scope..IssuesMaster im ON im.IssueID = hsg.Issueid
      LEFT JOIN z_scope..subIssuemaster sim on sim.subissueid = hsg.SubIssueid
      JOIN z_scope..ServiceMaster sm ON sm.ServiceID = im.VerticalID
      WHERE userid = ${userid} AND locationid = ${locationid}
      ORDER BY Addedon DESC
    `;
    const ticketResult = await request.query(ticketQuery);
    const TicketID = ticketResult.recordset[0].TicketID;
    const Service = ticketResult.recordset[0].Service;
    const issue = ticketResult.recordset[0].issue;
    const subissue = ticketResult.recordset[0].subissue;
    let Datetime = ticketResult.recordset[0].Addedon;

    const { formattedDate, formattedDateTime } = formatUTCDateTime(Datetime);
    // console.log(TicketID);

    // console.log(BrandId,issueid,locationid);

    const ToEmailQuery = `use z_scope 
                SELECT STRING_AGG([To],',')[To] FROM (
                select [To] from IssueWiseEmails where issueId = @Issue
                UNION
                select vcEmail from AdminMaster_GEN where bintid_pk = @user
                )b`
    const ToResult = await request.input('Issue',sql.Int,issueid).input('user',sql.Int,userid).query(ToEmailQuery);  
    const To = ToResult.recordset[0].To

    const CCEmailQuery = `use z_scope 
                    select STRING_AGG(Emails,',')CC from (
                    select CONCAT(GainerExec,',',GainerBDM)Emails from BrandWiseEmailsGainer 
                    where Brand = ${BrandId}
                    UNION
                    select CC from IssueWiseEmails where issueId = ${issueid}
                    UNION
                    select oEmail from adminmaster_gen where bintid_pk = (select BDMCode from LocationInfo where LocationID = ${locationid})
                    )as a`
    const CCResult = await request
    // .input('Issue',sql.Int,issueid).input('LocationId',sql.Int,locationid).input('BrandId',sql.Int,BrandId)
    .query(CCEmailQuery);
    const CC = CCResult.recordset[0].CC
    // console.log(CC);
    
    
    // 5. Send email (outside transaction but rollback if it fails)
    const mailOptions = helpandsupportMail(To, TicketID, Service, issue, formattedDate, username, formattedDateTime, Brand, Dealer, Location, subissue, desc, imageUrls, CC)
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        await transaction.rollback(); // rollback everything if mail fails
        console.error('Error sending email:', error);
        return res.status(500).json({ Error: 'Failed to send mail. Transaction rolled back.' });
      }

      await transaction.commit(); // commit only if everything succeeded
      res.status(200).json({ message: 'Ticket created and mail sent successfully.' });
    });
  } catch (error) {
    await transaction.rollback(); // rollback on any other error
    console.error('Transaction error:', error);
    res.status(500).json({ Error: error.message });
  }
};

function formatUTCDateTime(isoString) {
  const date = new Date(isoString);

  const day = String(date.getUTCDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert to 12-hour format, 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');

  const formattedDate = `${day}-${month}-${year}`;
  const formattedDateTime = `${formattedDate} ${formattedHours}:${minutes}:${seconds} ${ampm}`;

  return { formattedDate, formattedDateTime };
}

const IssueMAster = async (req, res) => {
  const pool = await getPool()
  const query = `select IssueID , Issue from IssuesMaster where status = 1`

  const result = await pool.request().query(query)
  res.status(200).json({ Data: result.recordset })
}

const subissueMaster = async (req, res) => {
  const pool = await getPool()
  const { issueid } = req.body
  const query = `select subissueid , subissue from subissuemaster where issueid = ${issueid}`

  const result = await pool.request().query(query)
  res.status(200).json({ Data: result.recordset })
}

export { helpsupportApi, IssueMAster, subissueMaster }


