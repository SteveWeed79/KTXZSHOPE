import mongoose, { Schema, model, models } from 'mongoose';

const CardSchema = new Schema ({
    name: {type: String, required: true},
    price: {type: Number, required: true},
    image: {type: String }, //URL to the card image
    description: {type: String },
    rarity: {type: String },
    brand: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Brand',
       required: true
    }
}, { timestamps: true});

const Card = models.Card || model('Card', CardSchema);
export default Card;