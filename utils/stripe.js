// utils/stripe.js - Enhanced with better error handling and debugging
require("dotenv").config();
const Stripe = require("stripe");

// Validate that the secret key exists and is properly formatted
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}

if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
  throw new Error("Invalid Stripe secret key format. Should start with 'sk_'");
}

// Log the key type for debugging (without exposing the actual key)
console.log(
  "Stripe key type:",
  process.env.STRIPE_SECRET_KEY.startsWith("sk_test_") ? "TEST" : "LIVE"
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

module.exports = stripe;
