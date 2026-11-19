import dotenv from "dotenv";

dotenv.config();

const cloudinaryUrl = process.env.CLOUDINARY_URL
    ? new URL(process.env.CLOUDINARY_URL)
    : null;

if (cloudinaryUrl && cloudinaryUrl.protocol !== "cloudinary:") {
    throw new Error("CLOUDINARY_URL must use the cloudinary:// scheme");
}

const config = {
    
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE,
    JWT_COOKIE_EXPIRE: process.env.JWT_COOKIE_EXPIRE,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || cloudinaryUrl?.hostname,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY
        || (cloudinaryUrl ? decodeURIComponent(cloudinaryUrl.username) : undefined),
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
        || (cloudinaryUrl ? decodeURIComponent(cloudinaryUrl.password) : undefined),
    FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY,
    FAST2SMS_SENDER_ID: process.env.FAST2SMS_SENDER_ID,
    FAST2SMS_TEMPLATE_ID: process.env.FAST2SMS_TEMPLATE_ID
}

export default config