const express = require("express");
const router = express.Router();
const userController = require("../../controller/custom.controller/user.controller.js");
const Category = require("../../model/category.model.js");
const Service = require("../../model/services.model.js");
const Order = require("../../model/order.model.js");
const { isLoggedIn } = require("../../middleware/auth.middleware.js");
const stripe = require("../../utils/stripe.js");

// Authentication routes
router
  .route("/login")
  .get(userController.loginForm)
  .post(userController.loginLogic);

router
  .route("/signup")
  .get(userController.signupForm)
  .post(userController.signupLogic);

router.get("/logout", userController.logoutLogic);

// Checkout page route
router.post("/checkout", isLoggedIn, (req, res) => {
  try {
    const obj = req.body;
    console.log("Checkout page data:", obj);
    res.render("custom/pages/checkout.ejs", obj);
  } catch (error) {
    console.error("Error rendering checkout:", error);
    res.status(500).render("custom/pages/error.ejs", {
      error: "Failed to load checkout page",
    });
  }
});

// Test route to verify JSON responses
router.get("/test-json", isLoggedIn, (req, res) => {
  res.json({
    success: true,
    message: "JSON response working",
    timestamp: new Date().toISOString(),
    user: req.session.user ? req.session.user._id : "not found",
  });
});

// Route to create a Stripe Checkout session - ENHANCED VERSION
router.post("/create-checkout-session", isLoggedIn, async (req, res) => {
  console.log("🚀 Create checkout session called");
  console.log("Request body:", req.body);

  try {
    const {
      data,
      user,
      fname,
      lname,
      email,
      address,
      city,
      state,
      zipcode,
      notes,
      locality,
    } = req.body;

    // Enhanced validation with JSON responses
    if (!data || !user || !email) {
      console.error("❌ Missing required fields:", {
        data: !!data,
        user: !!user,
        email: !!email,
      });
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: {
          data: !data ? "Data is required" : null,
          user: !user ? "User is required" : null,
          email: !email ? "Email is required" : null,
        },
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return res.status(400).json({
        success: false,
        error: "Invalid data format - could not parse JSON",
        details: parseError.message,
      });
    }

    // Validate parsed data
    if (!parsedData.product || Object.keys(parsedData.product).length === 0) {
      console.error("❌ No products found in parsed data");
      return res.status(400).json({
        success: false,
        error: "No products found in cart data",
      });
    }

    // Create line items with better error handling
    let lineItems;
    try {
      lineItems = Object.entries(parsedData.product).map(
        ([name, [qty, price]]) => {
          const quantity = parseInt(qty);
          const unitAmount = Math.round(parseFloat(price) * 100);

          if (isNaN(quantity) || quantity <= 0) {
            throw new Error(
              `Invalid quantity for product: ${name} (got: ${qty})`
            );
          }

          if (isNaN(unitAmount) || unitAmount <= 0) {
            throw new Error(
              `Invalid price for product: ${name} (got: ${price})`
            );
          }

          return {
            price_data: {
              currency: "inr",
              product_data: { name: name.toString() },
              unit_amount: unitAmount,
            },
            quantity: quantity,
          };
        }
      );
    } catch (itemError) {
      console.error("❌ Error creating line items:", itemError);
      return res.status(400).json({
        success: false,
        error: "Invalid product data",
        details: itemError.message,
      });
    }

    console.log("✅ Creating Stripe session with:", {
      userID: user,
      itemCount: lineItems.length,
      totalAmount: lineItems.reduce(
        (sum, item) => sum + item.price_data.unit_amount * item.quantity,
        0
      ),
    });

    // Create session with better URL handling
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${baseUrl}/user/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/user/checkout`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes from now
      metadata: {
        user: user.toString(),
        data: data, // Store original data string
        fname: (fname || "").toString(),
        lname: (lname || "").toString(),
        email: email.toString(),
        address: (address || "").toString(),
        city: (city || "").toString(),
        state: (state || "").toString(),
        zipcode: (zipcode || "").toString(),
        notes: (notes || "").toString(),
        locality: (locality || "").toString(),
      },
    });

    console.log("✅ Checkout session created successfully:", {
      sessionId: session.id,
      url: session.url,
      expiresAt: new Date(session.expires_at * 1000),
    });

    // Return success JSON response
    res.json({
      success: true,
      id: session.id,
      url: session.url,
      sessionId: session.id,
      debug: {
        keyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
          ? "test"
          : "live",
        lineItemCount: lineItems.length,
        totalAmount: lineItems.reduce(
          (sum, item) => sum + item.price_data.unit_amount * item.quantity,
          0
        ),
      },
    });
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);

    // Always return JSON, never HTML
    res.status(500).json({
      success: false,
      error: "Failed to create checkout session",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Enhanced payment success handler - COMPLETE VERSION
router.get("/payment-success", isLoggedIn, async (req, res) => {
  try {
    const sessionId = req.query.session_id;

    console.log("🔍 Payment success handler called with sessionId:", sessionId);

    if (!sessionId) {
      console.error("❌ No session ID provided");
      return res.redirect("/user/checkout?error=no_session");
    }

    // Validate session ID format
    if (!sessionId.startsWith("cs_")) {
      console.error("❌ Invalid session ID format:", sessionId);
      return res.redirect("/user/checkout?error=invalid_session");
    }

    console.log("🔍 Retrieving session:", sessionId);
    console.log(
      "🔑 Using key type:",
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "TEST" : "LIVE"
    );

    // Enhanced retry logic with exponential backoff
    let session;
    let retries = 3;
    let delay = 1000; // Start with 1 second

    while (retries > 0) {
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items", "payment_intent"],
        });
        console.log("✅ Session retrieved successfully:", {
          id: session.id,
          payment_status: session.payment_status,
          status: session.status,
          created: new Date(session.created * 1000),
          expires_at: new Date(session.expires_at * 1000),
        });
        break;
      } catch (error) {
        console.error(`❌ Session retrieval attempt ${4 - retries} failed:`, {
          message: error.message,
          type: error.type,
          code: error.code,
          statusCode: error.statusCode,
        });

        retries--;
        if (retries === 0) {
          // If it's a "resource missing" error, the session doesn't exist
          if (error.code === "resource_missing") {
            console.error("❌ Session not found - possible causes:");
            console.error("  - Session ID doesn't exist");
            console.error("  - Wrong API key (test vs live)");
            console.error("  - Session expired");
            console.error("  - Different Stripe account");
            return res.redirect("/user/checkout?error=session_not_found");
          }
          throw error;
        }

        // Wait with exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for next retry
      }
    }

    // Enhanced payment status checks
    if (!session) {
      console.error("❌ Session retrieval failed after all retries");
      return res.redirect("/user/checkout?error=session_retrieval_failed");
    }

    if (session.payment_status !== "paid") {
      console.log("⚠️ Payment not completed:", {
        payment_status: session.payment_status,
        status: session.status,
      });
      return res.redirect("/user/checkout?error=payment_not_completed");
    }

    // Check for required metadata
    if (!session.metadata || !session.metadata.user || !session.metadata.data) {
      console.error("❌ Missing required metadata in session");
      return res.redirect("/user/checkout?error=missing_metadata");
    }

    // Process the successful payment
    const {
      user,
      data,
      fname,
      lname,
      email,
      address,
      city,
      state,
      zipcode,
      notes,
    } = session.metadata;

    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (parseError) {
      console.error("❌ Error parsing metadata data:", parseError);
      return res.redirect("/user/checkout?error=data_parsing_failed");
    }

    const productList = Object.entries(parsedData.product).map(
      ([name, [qty, price]]) => ({
        name,
        quantity: parseInt(qty),
        price: parseFloat(price),
      })
    );

    // Check if order already exists to prevent duplicates
    const existingOrder = await Order.findOne({
      "payment.stripeSessionId": session.id,
    });

    if (existingOrder) {
      console.log("ℹ️ Order already exists for session:", session.id);
      return res.redirect("/user/thankyou");
    }

    // Create new order
    const newOrder = new Order({
      user,
      products: productList,
      subtotal: parsedData.subtotal,
      total: parsedData.total,
      shippingAddress: {
        fname,
        lname,
        email,
        address,
        city,
        state,
        zipcode,
        notes,
      },
      payment: {
        stripeSessionId: session.id,
        paymentIntentId: session.payment_intent?.id || null,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
      },
      payment_status: "Paid",
      status: "Pending",
    });

    await newOrder.save();
    console.log("✅ Order saved successfully:", newOrder._id);

    // Clear cart only if user session exists
    if (req.session.user && req.session.user.cart) {
      req.session.user.cart = [];
    }

    res.redirect("/user/thankyou");
  } catch (error) {
    console.error("❌ Error in payment-success:", {
      message: error.message,
      stack: error.stack,
      sessionId: req.query.session_id,
    });
    res.redirect("/user/checkout?error=processing_failed");
  }
});

// Debug endpoint to check Stripe configuration
router.get("/debug-stripe", isLoggedIn, async (req, res) => {
  try {
    // Test Stripe connection
    const account = await stripe.accounts.retrieve();

    res.json({
      stripeConnected: true,
      keyType: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
        ? "test"
        : "live",
      publishableKeyMatches:
        req.query.pk &&
        req.query.pk.startsWith("pk_test_") ===
          process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
      account: {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
      },
    });
  } catch (error) {
    res.status(500).json({
      stripeConnected: false,
      error: error.message,
      keyType: process.env.STRIPE_SECRET_KEY
        ? process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")
          ? "test"
          : "live"
        : "missing",
    });
  }
});

// Thank you page
router.get("/thankyou", isLoggedIn, (req, res) => {
  res.render("custom/pages/paymentSuccess.ejs");
});

// My Orders page
router.get("/my-orders", isLoggedIn, async (req, res) => {
  try {
    const filter = { user: req.session.user._id };
    if (req.query.status) filter.status = req.query.status;

    const orders = await Order.find(filter)
      .populate("electrician", "first_name last_name email phone")
      .sort({ createdAt: -1 });

    res.render("custom/pages/order.ejs", { orders });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res
      .status(500)
      .render("custom/pages/error.ejs", { error: "Failed to fetch orders" });
  }
});

// Cancel Order (Pending only)
router.post("/my-orders/:id/cancel", isLoggedIn, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.session.user._id,
    });

    if (!order || order.status !== "Pending") {
      req.flash("error", "Cannot cancel this order");
      return res.redirect("/user/my-orders");
    }

    order.status = "Cancelled";
    await order.save();

    req.flash("success", "Order cancelled successfully");
    res.redirect("/user/my-orders");
  } catch (err) {
    console.error("Error cancelling order:", err);
    req.flash("error", "Something went wrong");
    res.redirect("/user/my-orders");
  }
});

// Services page
router.get("/service", isLoggedIn, async (req, res) => {
  try {
    const data = await Service.find().sort({ category_name: 1 });
    const catry = await Category.find().sort({ category_name: 1 });
    const cart_item = req.session.user.cart || [];

    const obj = {
      service: data,
      category: catry,
      cartdata: cart_item,
    };

    res.render("custom/pages/category.ejs", obj);
  } catch (error) {
    console.error("Error loading services:", error);
    res
      .status(500)
      .render("custom/pages/error.ejs", { error: "Failed to load services" });
  }
});

// Add to cart
router.get("/addCart", isLoggedIn, (req, res) => {
  const { service } = req.query;

  if (service) {
    if (!req.session.user.cart) {
      req.session.user.cart = [];
    }
    req.flash("success", "Service Added To Cart.");
    req.session.user.cart.push(service);
  }

  res.redirect("/user/service");
});

// Remove from cart
router.get("/removeService", isLoggedIn, (req, res) => {
  const { service } = req.query;

  if (
    service &&
    req.session.user.cart &&
    req.session.user.cart.includes(service)
  ) {
    const index = req.session.user.cart.indexOf(service);
    if (index !== -1) {
      req.session.user.cart.splice(index, 1);
    }
    req.flash("success", "Service Removed");
  }

  res.redirect("/user/cart");
});

// Cart page
router.get("/cart", isLoggedIn, async (req, res) => {
  try {
    const items = req.session.user.cart || [];
    const services = [];

    for (const itemId of items) {
      const service = await Service.findById(itemId);
      if (service) {
        services.push(service);
      }
    }

    res.render("custom/pages/cart.ejs", { services: services });
  } catch (error) {
    console.error("Error loading cart:", error);
    res
      .status(500)
      .render("custom/pages/error.ejs", { error: "Failed to load cart" });
  }
});

// Static pages
router.get("/", (req, res) => {
  res.render("custom/pages/home.ejs");
});

router.get("/about", isLoggedIn, (req, res) => {
  res.render("custom/pages/about_us.ejs");
});

router.get("/blog", isLoggedIn, (req, res) => {
  res.render("custom/pages/blog.ejs");
});

router.get("/contact", isLoggedIn, (req, res) => {
  res.render("custom/pages/contact.ejs");
});

module.exports = router;
