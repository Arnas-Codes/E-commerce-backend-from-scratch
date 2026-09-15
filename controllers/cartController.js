import asyncHandler from "../utils/asyncHandler.js";
import Cart from "../models/cart.js";
import Product from "../models/product.js";

// add to cart
export const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [
        {
          product: productId,
          quantity: Number(quantity),
        },
      ],
    });

    return res.status(201).json({
      message: "Cart created and item added successfully",
      cart,
    });
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId,
  );

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += Number(quantity);
  } else {
    cart.items.push({
      product: productId,
      quantity: Number(quantity),
    });
  }

  await cart.save();

  return res.status(200).json({
    message: "Cart updated successfully",
    cart,
  });
});

// get cart
export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }
  return res.status(200).json({ cart });
});

// update quantity
export const updateQuantity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    return res.status(404).json({
      message: "Cart not found",
    });
  }

  const item = cart.items.find((item) => item.product.toString() === productId);

  if (!item) {
    return res.status(404).json({
      message: "Product not found in cart",
    });
  }

  item.quantity = quantity;

  await cart.save();

  return res.status(200).json({ cart });
});

// remove from cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    return res.status(404).json({
      message: "Cart not found",
    });

    const item = cart.items.find(
      (item) => item.product.toString() === productId,
    );
  }

  if (!item) {
    return res.status(404).json({ message: "Product not found in cart" });
  }
  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId,
  );
  await cart.save();

  return res.status(200).json({ cart });
});

// clear cart
export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  cart.items = [];
  await cart.save();
  return res.status(200).json({ cart });
});
