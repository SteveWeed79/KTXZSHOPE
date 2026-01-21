import mongoose, { Schema, model, models } from 'mongoose';

const CardSchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String }, 
    description: { type: String },
    rarity: { type: String },
    brand: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Brand',
       required: true
    },
    // --- VAULT & SCHEDULING FIELDS ---
    isVault: { type: Boolean, default: false },
    // Setting default to Date.now makes it go live immediately unless you pick a future date
    vaultReleaseDate: { type: Date, default: Date.now }, 
    vaultExpiryDate: { type: Date, default: null }, 
}, { timestamps: true });

const Card = models.Card || model('Card', CardSchema);
export default Card;