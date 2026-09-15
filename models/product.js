import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    
  },
  price: {
    type: Number,
    min: 0,
    required: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  stock:{
    type: Number,
    required: true,
    min: 0,
    default: 0,
  }
});

const Product = mongoose.model("Product", productSchema);
export default Product