import asyncHandler from "../utils/asyncHandler.js";
import Cart from "../models/cart.js";
import Product from "../models/product.js";
import Order from "../models/order.js";
import mongoose from "mongoose";
import InventoryMovement from "../models/inventoryMovement.js";

// create order
export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const session = await mongoose.startSession();

  let order;

  try {
    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: userId }).session(session);

      if (!cart || cart.items.length === 0) {
        const error = new Error("Cart is empty");
        error.statusCode = 400;
        throw error;
      }

      const products = [];
      const orderItems = [];

      for (const item of cart.items) {
        const product = await Product.findById(item.product).session(session);

        if (!product) {
          const error = new Error("Product not found");
          error.statusCode = 404;
          throw error;
        }

        if (item.quantity > product.stock) {
          const error = new Error("Not enough stock");
          error.statusCode = 400;
          throw error;
        }

        products.push({
          product,
          quantity: item.quantity,
        });

        orderItems.push({
          product: item.product,
          quantity: item.quantity,
          price: product.price,
        });
      }

      const totalPrice = orderItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );

      [order] = await Order.create(
        [
          {
            user: userId,
            items: orderItems,
            totalPrice,
          },
        ],
        { session },
      );

      for (const item of products) {
        item.product.stock -= item.quantity;

        await item.product.save({ session });

        await InventoryMovement.create(
          [
            {
              product: item.product._id,
              change: -item.quantity,
              type: "sale",
              reason: `Order ${order._id}`,
            },
          ],
          {
            session,
          },
        );
      }

      await Cart.findOneAndDelete({
        user: userId,
      }).session(session);
    });

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } finally {
    session.endSession();
  }
});

// get orders
export const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const orders = await Order.find({ user: userId }).populate("items.product");

  return res.status(200).json({ orders });
});

// get order by id
export const getMyOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;
  const order = await Order.findOne({ _id: orderId, user: userId }).populate(
    "items.product",
  );

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  return res.status(200).json({ order });
});

// get all orders by admin
export const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, from, to, user } = req.query;

  const filter = {};
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (user) {
    filter.user = user;
  }

  if (status) {
    filter.status = status;
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) {
      filter.createdAt.$gte = new Date(from);
    }
    if (to) {
      filter.createdAt.$lte = new Date(to);
    }
  }

  const totalOrders = await Order.countDocuments(filter);

  const totalPages = Math.ceil(totalOrders / limitNumber);
  const skip = (pageNumber - 1) * limitNumber;
  const orders = await Order.find(filter)
    .populate("user", "name email")
    .populate("items.product")
    .skip(skip)
    .limit(limitNumber);

  return res.status(200).json({
    orders,
    totalOrders,
    totalPages,
    currentPage: pageNumber,
  });
});

// update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({
      message: "Order not found",
    });
  }

  const allowedTransitions = {
    pending: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  const allowNextStatus = allowedTransitions[order.status] || [];
  if (!allowNextStatus.includes(status)) {
    return res.status(400).json({
      message: "Invalid status transition.",
    });
  }
  if (status === "cancelled") {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }
  }
  order.status = status;

  await order.save();

  return res.status(200).json({
    message: "Order status updated succesfully",
    order,
  });
});

// get order stats
export const getOrderStats = asyncHandler(async (req, res) => {
  const orderStats = await Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  return res.status(200).json({
    orderStats,
  });
});

//  get revenue stats
export const getRevenueStats = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const filter = { status: "delivered" };

  if (from || to) {
    filter.createdAt = {};
  }

  if (from) {
    filter.createdAt.$gte = new Date(from);
  }
  if (to) {
    filter.createdAt.$lte = new Date(to);
  }
  const revenueStats = await Order.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$totalPrice" },
      },
    },
  ]);

  return res.status(200).json({
    revenueStats,
  });
});

// order with userInfo
export const getOrdersWithUsers = asyncHandler(async (req, res) => {
  const orders = await Order.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    {
      $unwind: "$userInfo",
    },
  ]);

  return res.status(200).json({
    orders,
  });
});

//  get top customers
export const getTopCustomers = asyncHandler(async (req, res) => {
  const topCustomers = await Order.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    {
      $unwind: "$userInfo",
    },
    {
      $group: {
        _id: "$userInfo._id",
        name: { $first: "$userInfo.name" },
        email: { $first: "$userInfo.email" },
        totalSpent: { $sum: "$totalPrice" },
      },
    },
    {
      $sort: {
        totalSpent: -1,
      },
    },
    {
      $limit: 10,
    },
  ]);

  return res.status(200).json({
    topCustomers,
  });
});

// get best selling products
export const getBestSellingProducts = asyncHandler(async (req, res) => {
  const bestSellingProducts = await Order.aggregate([
    {
      $match: {
        status: "delivered",
      },
    },
    {
      $unwind: "$items",
    },
    {
      $group: {
        _id: "$items.product",
        totalUnitsSold: {
          $sum: "$items.quantity",
        },
      },
    },
    {
      $sort: {
        totalUnitsSold: -1,
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    {
      $unwind: "$productInfo",
    },
    {
      $project: {
        _id: 0,
        productId: "$productInfo._id",
        name: "$productInfo.name",
        price: "$productInfo.price",
        totalUnitsSold: 1,
      },
    },
  ]);

  return res.status(200).json({
    bestSellingProducts,
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user._id;
  const { reason } = req.query;
  const inventoryMovements = [];

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: orderId, user: userId }).session(
        session,
      );
      if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      const notAllowedStatusToCancel = ["shipped", "delivered", "cancelled"];
      if (notAllowedStatusToCancel.includes(order.status)) {
        const error = new Error(
          `Order cannot be cancelled because it is already ${order.status} `,
        );
        error.statusCode = 400;
        throw error;
      }
      order.status = "cancelled";

      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);

        if (!product) {
          const error = new Error("Product not found");
          error.statusCode = 404;
          throw error;
        }

        product.stock += item.quantity;
        await product.save({ session });

        const [movement] = await InventoryMovement.create(
          [
            {
              product: product._id,
              change: item.quantity,
              type: "order_cancelled",
              reason: reason || "Other reasons",
            },
          ],
          { session },
        );

        inventoryMovements.push(movement);
        await order.save({ session });
      }
    });

    return res.status(200).json({
      message: "Order cancelled successfully",
      inventoryMovements,
    });
  } finally {
    session.endSession();
  }
});

export const returnOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { items, reason } = req.body;
  const { orderId } = req.params;

  const inventoryMovements = [];
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        user: userId,
      }).session(session);

      if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
      }

      if (order.status !== "delivered") {
        const error = new Error("Only delivered orders can be returned");
        error.statusCode = 400;
        throw error;
      }

      if (!Array.isArray(items) || items.length === 0) {
        const error = new Error("Return items are required");
        error.statusCode = 400;
        throw error;
      }

      const productIds = items.map((item) => item.product?.toString());
      const uniqueProductIds = new Set(productIds);

      if (uniqueProductIds.size !== productIds.length) {
        const error = new Error("Duplicate product entries in return request");
        error.statusCode = 400;
        throw error;
      }

      for (const item of items) {
        const { product, quantity } = item;

        if (!Number.isInteger(quantity) || quantity <= 0) {
          const error = new Error("Quantity must be a positive integer");
          error.statusCode = 400;
          throw error;
        }

        const orderItem = order.items.find(
          (orderItem) => orderItem.product.toString() === product.toString(),
        );

        if (!orderItem) {
          const error = new Error("Product is not part of this order");
          error.statusCode = 400;
          throw error;
        }

        const returnableQuantity =
          orderItem.quantity - orderItem.returnedQuantity;

        if (quantity > returnableQuantity) {
          const error = new Error(
            `Cannot return ${quantity}. Only ${returnableQuantity} item(s) can be returned.`,
          );
          error.statusCode = 400;
          throw error;
        }

        const existingProduct =
          await Product.findById(product).session(session);

        if (!existingProduct) {
          const error = new Error("Product not found");
          error.statusCode = 404;
          throw error;
        }

        existingProduct.stock += quantity;

        await existingProduct.save({ session });

        orderItem.returnedQuantity += quantity;

        const [movement] = await InventoryMovement.create(
          [
            {
              product: existingProduct._id,
              change: quantity,
              type: "return",
              reason: reason || "Order item returned",
            },
          ],
          { session },
        );

        inventoryMovements.push(movement);
      }

      await order.save({ session });
    });

    return res.status(200).json({
      message: "Order items returned successfully",
      inventoryMovements,
    });
  } finally {
    await session.endSession();
  }
});
