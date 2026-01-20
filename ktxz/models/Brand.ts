import mongoose, { Schema, model, models } from 'mongoose';

const BrandSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Brand Nae is required'],
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
}, { timestamps: true});

const Brand = models.Brand || model('Brand', BrandSchema);

export default Brand;