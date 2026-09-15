export const validatePayment = (req, res, next) => {
  const { paymentId } = req.params;
  if (!paymentId) {
    return res.status(400).json({ message: "Payment id is required" });
  }
  next();
};
