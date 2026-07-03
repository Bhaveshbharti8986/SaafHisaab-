import dotenv from "dotenv";

dotenv.config();

const config = {
    
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE,
    JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY
}

export default config