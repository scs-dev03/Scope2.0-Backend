import nodemailer from "nodemailer"
import 'dotenv/config'
import path from 'path'
// import { fileURLToPath } from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAILID,
    pass: process.env.EMAILPASSWORD,
  },
});

const tatacvBrandPoolMail = (date,url) => ({
  from: `"Gainer AutoMailer" <${process.env.EMAILID}>`,
 to: 'Chandan.Anand@tatamotors.com,vorsupport_pne@tatamotors.com,abhinaba.sahu@tatamotors.com,Anurag.Chatterjee@tatamotors.com,singh.arvind@tatamotors.com,Ashwani.Anand@tatamotors.com,chetan.garg@tatamotors.com,haribaskar.md@tatamotors.com,pritesh.mishra@tatamotors.com,rajesh.roshan@tatamotors.com,rishi.ranjan@tatamotors.com,sandeep.kapoor@tatamotors.com,santanu.das@tatamotors.com,s.bahuleyan@tatamotors.com,Shreshth.AGARWAL@tatamotors.com,tamal.saha@tatamotors.com,vikas.kothari@tatamotors.com,vikash.jha@tatamotors.com,GBB820982@tatamotors.com',
  cc: 'sandeep.avhad@tatamotors.com,hanish.khattar@sparecare.in,gainer.ho@sparecare.in,aryaman.phukan@tatamotors.com,shaaktee.narayan@tatamotors.com,ramakrishna.p@tatamotors.com,bpp11000436@tatamotors.com,piyush.lall@tatamotors.com,shrikant.varade@tatamotors.com,rupesh.jewrikar@tatamotors.com',
   bcc:'scope@sparecare.in,vishu.bansal@sparecare.in',
  subject: `Tata PCBU Brand Pool Stock for ${date}`,
  html: `
    <p>Hi Team</p>
   <p>Kindly find below the <strong><a href="${url}" target="_blank">Link</a></strong> to download the latest Non Moving Pool Stock of Tata PCBU brand dealers in Gainer.</p>
   <p>Regards,<br/>Team SpareCare</p>`
});

const Honda4WBrandPoolMail = (date,url) => ({
  from: `"Gainer AutoMailer" <${process.env.EMAILID}>`,
  to : ' ssgupta@honda.co.in,psohal@honda.co.in,scvijay@honda.co.in,ngoud@hondacarindia.com,djain@honda.co.in',
  cc : ' hanish.khattar@sparecare.in,manish.sharma@sparecare.in,gainer.exec8@sparecare.in,gainer.ho@sparecare.in',
  // to: 'vishu.bansal@sparecare.in',
  bcc:'scope@sparecare.in,vishu.bansal@sparecare.in',
  subject: `Honda 4W Brand Pool Stock for ${date}`,
  html: `
    <p>Hi Team</p>
   <p>Kindly find below the <strong><a href="${url}" target="_blank">Link</a></strong> to download the latest Non Moving Pool Stock of Honda 4W brand dealers in Gainer.</p>
   <p>Regards,<br/>Team SpareCare</p>`
});

const helpandsupportMail = (To,TicketID,Service,issue,formattedDate,username,formattedDateTime,Brand,Dealer,Location,subissue,desc,imageUrls,CC)=>({
    from: `"Gainer AutoMailer" <${process.env.EMAILID}>`,
      to: To,
      cc: CC,
      subject:`[Ticket #${TicketID}]: ${Service}_${issue}_${formattedDate}`,
      html: `
        <p>Hi <strong>${username}</strong>,</p>
        <p>Thank you for contacting us. This is an automated response confirming the receipt of your ticket. One of our agents will get back to you as soon as possible.</p>
        <p><strong>Ticket Details:</strong></p>
        <ul>
          <li><strong>Ticket ID:</strong> #${TicketID}</li>
          <li><strong>Ticket Date:</strong> ${formattedDateTime}</li>
          <li><strong>Service:</strong> ${Service}</li>
          <li><strong>Brand:</strong> ${Brand}</li>
          <li><strong>Dealer:</strong> ${Dealer}</li>
          <li><strong>Location:</strong> ${Location}</li>
          <li><strong>Issue:</strong> ${issue}</li>
          <li><strong>SubIssue:</strong> ${subissue}</li>
          <li><strong>Description:</strong> ${desc}</li>
          <li><strong>Status:</strong> Being Processed</li>
          <li><strong>Priority:</strong> High</li>
          ${imageUrls && imageUrls.length > 0 ? `
            <p><strong>Photos:</strong></p>
            <ul>
              ${imageUrls.map(url => `<li><a href="${url}" target="_blank">View Image</a></li>`).join('')}
            </ul>
          ` : ''}
        </ul>
        <p>Regards,<br/>Team SpareCare</p>`
})

export {transporter,tatacvBrandPoolMail,helpandsupportMail,Honda4WBrandPoolMail}