 import mongoose from "mongoose";
import { type } from "os";

 const otpSchema= new mongoose.Schema(
  {  otpHash : {type:String ,required:true},
    
     type: { type: String, enum:["email", "mobile"] ,required:true},
     email: { type: String},
     mobile: { type: String },
     purpose:{type:String,enum:["register","login","forgot_password"]},
      createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // 5 minutes
    },
  }
,{ timestamps: true })
 const otpModel = mongoose.model("Otp", otpSchema);
 export default otpModel