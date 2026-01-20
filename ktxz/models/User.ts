import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    trim: true 
  },
  email: { 
    type: String, 
    unique: true, 
    required: true, 
    lowercase: true 
  },
  password: { 
    type: String,
    select: false, // <-- Crucial: This hides the hashed password from default queries
  },
  image: { 
    type: String 
  },
  role: { 
    type: String, 
    enum: ["admin", "customer"], 
    default: "customer" 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, {
  // This automatically converts _id to a string when sending data to the frontend
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.models.User || mongoose.model("User", UserSchema);