// utils/jwtUtils.js
import jwt from 'jsonwebtoken';
// import { JWT_SECRET, JWT_EXPIRATION_TIME } from '../config/config';
import "dotenv/config";
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION_TIME });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;  // Return null if the token is invalid or expired
  }
};

export { generateToken, verifyToken };
