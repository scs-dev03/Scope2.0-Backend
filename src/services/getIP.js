import os from 'os';
import https from 'https';



/**
 * Get the local IP address of the server
 * @returns {string} Local IP address (e.g., 192.168.x.x)
 */
function getLocalIp() {
  const networkInterfaces = os.networkInterfaces();
  let localIpAddress = '';

  for (const interfaceName in networkInterfaces) {
    for (const interfaceDetails of networkInterfaces[interfaceName]) {
      if (!interfaceDetails.internal && interfaceDetails.family === 'IPv4') {
        localIpAddress = interfaceDetails.address;
        break;
      }
    }
  }

  return localIpAddress || 'No local IP found';
}

/**
 * Get the public IP address of the server by calling an external API
 * @returns {Promise<string>} Public IP address (e.g., 203.0.113.5)
 */
function getPublicIp() {
  return new Promise((resolve, reject) => {
    const url = 'https://ipinfo.io/json'; // New URL for ipinfo.io
    
    https.get(url, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData.ip); // Get the IP from the response
        } catch (error) {
            console("error in public ip",eror)
          reject('Error parsing public IP response');
        }
      });

    }).on('error', (error) => {
      reject(`Error fetching public IP: ${error.message}`);
    });
  });
}

/**
 * Get the client IP address from the request (for use in an Express.js app)
 * @param {Object} req - The Express request object
 * @returns {string} Client's IP address
 */
function getClientIp(req) {
    if (!req || !req.headers) {
      return 'Unknown IP';
    }
  
    // Check if x-forwarded-for header exists
    const xForwardedFor = req.headers['x-forwarded-for'];
  
    if (xForwardedFor) {
      // If x-forwarded-for exists, take the first IP in the list
      const ips = xForwardedFor.split(',');
      return ips[0].trim();  // Take the first IP in the list (usually the client's IP)
    }
  
    // If no x-forwarded-for header, fall back to the remoteAddress
    return req.connection.remoteAddress || 'Unknown IP';
  }
  

// module.exports = {
//   getLocalIp,
//   getPublicIp,
//   getClientIp
// };


export  {
    getLocalIp,
    getPublicIp,
    getClientIp
  };
