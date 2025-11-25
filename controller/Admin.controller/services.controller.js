const mongoose = require("mongoose");
const User = require("../../model/user.model.js");
const Category = require("../../model/category.model.js");
const Service = require("../../model/services.model.js");
const Electrician = require("../../model/electrician.model.js");
const Order = require("../../model/order.model.js");
const Admin = require("../../model/admin.js");
const bcrypt = require("bcrypt");

// Import the fixed upload functions - make sure path is correct
const {
  categoryUpload,
  serviceUpload,
  testCloudinaryConnection,
} = require("../../cloudConfig.js");

// Other existing methods remain the same...
exports.signup = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      req.flash("error", "Username and password are required");
      return res.redirect("/admin/signup");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, password: hashedPassword });

    await newAdmin.save();
    req.session.admin = username;
    res.redirect("/admin/");
  } catch (err) {
    console.error("Signup error:", err);
    req.flash("error", "Failed to create admin account");
    res.redirect("/admin/signup");
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const user = await Admin.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    req.session.admin = user.username;
    return res.redirect("/admin/");
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Server error during login",
    });
  }
};

exports.manageHome = async (req, res) => {
  try {
    let user = await User.countDocuments();
    let category = await Category.countDocuments();
    let service = await Service.countDocuments();
    let electrician = await Electrician.countDocuments();
    let order = await Order.countDocuments();

    const orders = await Order.find()
      .populate("user")
      .populate("electrician")
      .sort({ createdAt: -1 });

    let obj = {
      ucount: user,
      ccount: category,
      scount: service,
      ecount: electrician,
      bcount: order,
      orders: orders,
    };
    res.render("admin/pages/home.ejs", obj);
  } catch (error) {
    console.error("Error loading dashboard:", error);
    req.flash("error", "Failed to load dashboard");
    res.redirect("/admin/login");
  }
};

exports.manageUser = async (req, res) => {
  try {
    let data = await User.find();
    res.render("admin/pages/manageUser.ejs", { users: data });
  } catch (error) {
    console.error("Error loading users:", error);
    req.flash("error", "Failed to load users");
    res.redirect("/admin/");
  }
};

exports.addElectrician = async (req, res) => {
  try {
    let { first_name, last_name, phone, address, email, password } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !phone || !email || !password) {
      req.flash("error", "All fields are required");
      return res.redirect("/admin/addElectrician");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newElectrician = new Electrician({
      first_name,
      last_name,
      phone,
      address,
      email,
      password: hashedPassword,
    });

    await newElectrician.save();
    req.flash("success", "Electrician added Successfully");
    res.redirect("/admin/manageElectrician");
  } catch (error) {
    console.error("Error adding electrician:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((error) => error.message);
      req.flash("error", errors);
    } else if (error.code === 11000) {
      req.flash("error", "Electrician with this email already exists");
    } else {
      req.flash("error", "Failed to add electrician");
    }
    res.redirect("/admin/addElectrician");
  }
};

exports.updateElectrician = async (req, res) => {
  try {
    const electricianId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(electricianId)) {
      req.flash("error", "Invalid electrician ID");
      return res.redirect("/admin/manageElectrician");
    }

    const data = await Electrician.findById(electricianId);
    if (!data) {
      req.flash("error", "Electrician not found");
      return res.redirect("/admin/manageElectrician");
    }

    res.render("admin/pages/updateElectrician.ejs", { electrician: data });
  } catch (error) {
    console.error("Error loading electrician:", error);
    req.flash("error", "Failed to load electrician data");
    res.redirect("/admin/manageElectrician");
  }
};

exports.updateElectricianlogic = async (req, res) => {
  try {
    const electricianId = req.params.id;
    let { first_name, last_name, phone, address, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(electricianId)) {
      req.flash("error", "Invalid electrician ID");
      return res.redirect("/admin/manageElectrician");
    }

    const updateData = { first_name, last_name, phone, address };

    // Only update password if provided
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await Electrician.findByIdAndUpdate(electricianId, updateData, {
      new: true,
      runValidators: true,
    });

    req.flash("success", "Electrician Updated Successfully");
    res.redirect("/admin/manageElectrician");
  } catch (error) {
    console.error("Error updating electrician:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((error) => error.message);
      req.flash("error", errors);
    } else {
      req.flash("error", "Failed to update electrician");
    }
    res.redirect("/admin/manageElectrician");
  }
};

exports.deleteElectrician = async (req, res) => {
  const electricianId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(electricianId)) {
    req.flash("error", "Invalid Electrician ID");
    return res.redirect("/admin/manageElectrician");
  }

  try {
    const deleteElectrician = await Electrician.findByIdAndDelete(
      electricianId
    );

    if (!deleteElectrician) {
      req.flash("error", "Electrician not found");
      return res.redirect("/admin/manageElectrician");
    }

    req.flash("success", "Electrician removed successfully");
    res.redirect("/admin/manageElectrician");
  } catch (err) {
    console.error("Error deleting electrician:", err);
    req.flash("error", "Something went wrong");
    res.redirect("/admin/manageElectrician");
  }
};

exports.manageElectrician = async (req, res) => {
  try {
    let data = await Electrician.find();
    res.render("admin/pages/manageElectrician.ejs", { electrician: data });
  } catch (error) {
    console.error("Error loading electricians:", error);
    req.flash("error", "Failed to load electricians");
    res.redirect("/admin/");
  }
};

exports.addcategoryform = (req, res) => {
  res.render("admin/pages/addCategory.ejs");
};

// ENHANCED: Category upload logic with better error handling
// Debug version of addcategorylogic function
exports.addcategorylogic = async (req, res) => {
  console.log("=== CATEGORY UPLOAD DEBUG START ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Content-Type:", req.headers["content-type"]);

  try {
    // Use the enhanced upload middleware
    categoryUpload(req, res, async (err) => {
      console.log("=== INSIDE UPLOAD CALLBACK ===");

      if (err) {
        console.error("❌ UPLOAD ERROR:", {
          message: err.message,
          code: err.code,
          stack: err.stack,
          userMessage: err.userMessage,
        });

        if (err.code === "LIMIT_FILE_SIZE") {
          req.flash(
            "error",
            "File size too large. Please select a smaller image."
          );
        } else if (err.code === "LIMIT_FILE_COUNT") {
          req.flash("error", "Too many files. Please select only one image.");
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
          req.flash(
            "error",
            "Unexpected file field. Please use the correct form field."
          );
        } else {
          req.flash(
            "error",
            err.userMessage || `Upload failed: ${err.message}`
          );
        }

        return res.redirect("/admin/addCategory");
      }

      console.log("✅ UPLOAD SUCCESS");
      console.log("Request body:", req.body);
      console.log(
        "Request file:",
        req.file
          ? {
              fieldname: req.file.fieldname,
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              filename: req.file.filename,
              path: req.file.path,
              size: req.file.size,
              public_id: req.file.public_id,
            }
          : "No file found"
      );

      try {
        const { category_name } = req.body;
        console.log("Category name extracted:", category_name);

        // Enhanced validation
        if (!category_name || category_name.trim().length === 0) {
          console.log("❌ VALIDATION FAILED: No category name");
          req.flash("error", "Category name is required");
          return res.redirect("/admin/addCategory");
        }

        if (category_name.trim().length < 2) {
          console.log("❌ VALIDATION FAILED: Category name too short");
          req.flash(
            "error",
            "Category name must be at least 2 characters long"
          );
          return res.redirect("/admin/addCategory");
        }

        // Check if file was uploaded
        if (!req.file) {
          console.log("❌ VALIDATION FAILED: No file uploaded");
          req.flash("error", "Please select an image file");
          return res.redirect("/admin/addCategory");
        }

        console.log("✅ VALIDATION PASSED");

        // Check for existing category
        console.log("Checking for existing category...");
        const existingCategory = await Category.findOne({
          category_name: {
            $regex: new RegExp(`^${category_name.trim()}$`, "i"),
          },
        });

        if (existingCategory) {
          console.log("❌ CATEGORY EXISTS:", existingCategory);
          req.flash("error", "Category with this name already exists");
          return res.redirect("/admin/addCategory");
        }

        console.log("✅ NO EXISTING CATEGORY FOUND");

        // Create new category
        const categoryData = {
          category_name: category_name.trim(),
          category_image: req.file.path,
        };

        console.log("Creating category with data:", categoryData);

        const newCategory = new Category(categoryData);

        console.log("Category instance created:", {
          _id: newCategory._id,
          category_name: newCategory.category_name,
          category_image: newCategory.category_image,
        });

        console.log("Attempting to save to database...");
        const savedCategory = await newCategory.save();

        console.log("✅ CATEGORY SAVED SUCCESSFULLY:", {
          _id: savedCategory._id,
          category_name: savedCategory.category_name,
          category_image: savedCategory.category_image,
          createdAt: savedCategory.createdAt,
        });

        req.flash("success", "Category added successfully!");
        return res.redirect("/admin/manageCategory");
      } catch (dbError) {
        console.error("❌ DATABASE ERROR:", {
          message: dbError.message,
          code: dbError.code,
          name: dbError.name,
          errors: dbError.errors,
          stack: dbError.stack,
        });

        if (dbError.code === 11000) {
          console.log("Duplicate key error details:", dbError.keyValue);
          req.flash("error", "Category with this name already exists");
        } else if (dbError.name === "ValidationError") {
          const errors = Object.values(dbError.errors).map((err) => {
            console.log("Validation error:", err.message);
            return err.message;
          });
          req.flash("error", errors.join(", "));
        } else {
          req.flash("error", "Failed to add category. Please try again.");
        }

        return res.redirect("/admin/addCategory");
      }
    });
  } catch (outerError) {
    console.error("❌ OUTER ERROR:", {
      message: outerError.message,
      stack: outerError.stack,
    });
    req.flash("error", "An unexpected error occurred");
    res.redirect("/admin/addCategory");
  }

  console.log("=== CATEGORY UPLOAD DEBUG END ===");
};

exports.managecategory = async (req, res) => {
  try {
    const data = await Category.find();
    res.render("admin/pages/manageCategory.ejs", { list: data });
  } catch (error) {
    console.error("Error loading categories:", error);
    req.flash("error", "Failed to load categories");
    res.redirect("/admin/");
  }
};

exports.deletecategory = async (req, res) => {
  const categoryId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    req.flash("error", "Invalid category ID");
    return res.redirect("/admin/manageCategory");
  }

  try {
    const deletedCategory = await Category.findByIdAndDelete(categoryId);

    if (!deletedCategory) {
      req.flash("error", "Category not found");
      return res.redirect("/admin/manageCategory");
    }

    // Delete associated services
    const deletedServices = await Service.deleteMany({
      category_name: deletedCategory.category_name,
    });

    console.log(
      `Deleted ${deletedServices.deletedCount} services associated with category`
    );

    req.flash(
      "success",
      "Category and associated services removed successfully"
    );
    res.redirect("/admin/manageCategory");
  } catch (err) {
    console.error("Error deleting category:", err);
    req.flash("error", "Something went wrong while deleting category");
    res.redirect("/admin/manageCategory");
  }
};

exports.addserviceform = async (req, res) => {
  try {
    const data = await Category.find();
    res.render("admin/pages/addService.ejs", { list: data });
  } catch (error) {
    console.error("Error loading service form:", error);
    req.flash("error", "Failed to load service form");
    res.redirect("/admin/");
  }
};

// ENHANCED: Service upload logic with better error handling
exports.addservicelogic = async (req, res) => {
  try {
    // Use the enhanced service upload middleware
    serviceUpload(req, res, async (err) => {
      if (err) {
        console.error("Service upload error:", err);

        // Handle specific multer errors
        if (err.code === "LIMIT_FILE_SIZE") {
          req.flash(
            "error",
            "File size too large. Please select a smaller image."
          );
        } else if (err.code === "LIMIT_FILE_COUNT") {
          req.flash("error", "Too many files. Please select only one image.");
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
          req.flash(
            "error",
            "Unexpected file field. Please use the correct form field."
          );
        } else {
          req.flash(
            "error",
            err.userMessage || `Upload failed: ${err.message}`
          );
        }

        return res.redirect("/admin/addService");
      }

      try {
        const { service_name, category_name, price, time, description } =
          req.body;

        // Enhanced validation
        if (!service_name || !category_name || !price || !time) {
          req.flash(
            "error",
            "Service name, category, price, and time are required"
          );
          return res.redirect("/admin/addService");
        }

        if (service_name.trim().length < 2) {
          req.flash("error", "Service name must be at least 2 characters long");
          return res.redirect("/admin/addService");
        }

        if (isNaN(price) || parseFloat(price) <= 0) {
          req.flash("error", "Price must be a valid positive number");
          return res.redirect("/admin/addService");
        }

        if (isNaN(time) || parseInt(time) <= 0) {
          req.flash("error", "Time must be a valid positive number");
          return res.redirect("/admin/addService");
        }

        // Check if file was uploaded
        if (!req.file) {
          req.flash("error", "Please select an image file");
          return res.redirect("/admin/addService");
        }

        // Check if category exists
        const categoryExists = await Category.findOne({ category_name });
        if (!categoryExists) {
          req.flash("error", "Selected category does not exist");
          return res.redirect("/admin/addService");
        }

        // Check for existing service in the same category
        const existingService = await Service.findOne({
          service_name: { $regex: new RegExp(`^${service_name.trim()}$`, "i") },
          category_name,
        });

        if (existingService) {
          req.flash(
            "error",
            "Service with this name already exists in this category"
          );
          return res.redirect("/admin/addService");
        }

        // Log successful upload details
        console.log("Service image uploaded successfully:", {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          public_id: req.file.public_id,
        });

        // Create new service with Cloudinary URL
        const newService = new Service({
          service_name: service_name.trim(),
          category_name,
          service_image: req.file.path, // This is the Cloudinary URL
          price: parseFloat(price),
          time: parseInt(time),
          description: description ? description.trim() : "",
        });

        await newService.save();
        console.log("Service saved to database:", newService._id);

        req.flash("success", "Service added successfully!");
        res.redirect("/admin/manageService");
      } catch (error) {
        console.error("Error saving service:", error);

        if (error.code === 11000) {
          req.flash(
            "error",
            "Service with this name already exists in this category"
          );
        } else if (error.name === "ValidationError") {
          const errors = Object.values(error.errors).map((err) => err.message);
          req.flash("error", errors.join(", "));
        } else {
          req.flash("error", "Failed to add service. Please try again.");
        }

        res.redirect("/admin/addService");
      }
    });
  } catch (error) {
    console.error("Unexpected error in addservicelogic:", error);
    req.flash("error", "An unexpected error occurred");
    res.redirect("/admin/addService");
  }
};

exports.manageservice = async (req, res) => {
  try {
    let service = await Service.find();
    res.render("admin/pages/manageService.ejs", { list: service });
  } catch (error) {
    console.error("Error loading services:", error);
    req.flash("error", "Failed to load services");
    res.redirect("/admin/");
  }
};

exports.serviceupdateform = async (req, res) => {
  try {
    const serviceId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      req.flash("error", "Invalid service ID");
      return res.redirect("/admin/manageService");
    }

    const data = await Service.findById(serviceId);
    if (!data) {
      req.flash("error", "Service not found");
      return res.redirect("/admin/manageService");
    }

    let catry = await Category.find();
    let obj = { list: data, category: catry };
    res.render("admin/pages/updateServices.ejs", obj);
  } catch (error) {
    console.error("Error loading service update form:", error);
    req.flash("error", "Failed to load service data");
    res.redirect("/admin/manageService");
  }
};

// ENHANCED: Service update logic
exports.serviceupdatelogic = async (req, res) => {
  try {
    // Use the enhanced service upload middleware
    serviceUpload(req, res, async (err) => {
      if (err) {
        console.error("Service update upload error:", err);

        // Handle specific multer errors
        if (err.code === "LIMIT_FILE_SIZE") {
          req.flash(
            "error",
            "File size too large. Please select a smaller image."
          );
        } else if (err.code === "LIMIT_FILE_COUNT") {
          req.flash("error", "Too many files. Please select only one image.");
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
          req.flash(
            "error",
            "Unexpected file field. Please use the correct form field."
          );
        } else {
          req.flash(
            "error",
            err.userMessage || `Upload failed: ${err.message}`
          );
        }

        return res.redirect("/admin/manageService");
      }

      try {
        const { category_name, price, time, description } = req.body;
        const serviceId = req.params.id;

        // Validate service ID
        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
          req.flash("error", "Invalid service ID");
          return res.redirect("/admin/manageService");
        }

        // Enhanced validation
        if (!category_name || !price || !time) {
          req.flash("error", "Category, price, and time are required");
          return res.redirect("/admin/manageService");
        }

        if (isNaN(price) || parseFloat(price) <= 0) {
          req.flash("error", "Price must be a valid positive number");
          return res.redirect("/admin/manageService");
        }

        if (isNaN(time) || parseInt(time) <= 0) {
          req.flash("error", "Time must be a valid positive number");
          return res.redirect("/admin/manageService");
        }

        // Check if category exists
        const categoryExists = await Category.findOne({ category_name });
        if (!categoryExists) {
          req.flash("error", "Selected category does not exist");
          return res.redirect("/admin/manageService");
        }

        // Prepare update data
        const serviceData = {
          category_name,
          price: parseFloat(price),
          time: parseInt(time),
          description: description ? description.trim() : "",
        };

        // Only update image if new file was uploaded
        if (req.file && req.file.path) {
          serviceData.service_image = req.file.path;
          console.log("Service image updated:", req.file.path);
        }

        const updatedService = await Service.findByIdAndUpdate(
          serviceId,
          serviceData,
          { new: true, runValidators: true }
        );

        if (!updatedService) {
          req.flash("error", "Service not found");
          return res.redirect("/admin/manageService");
        }

        console.log("Service updated successfully:", updatedService._id);
        req.flash("success", "Service updated successfully!");
        res.redirect("/admin/manageService");
      } catch (error) {
        console.error("Error updating service:", error);

        if (error.name === "ValidationError") {
          const errors = Object.values(error.errors).map((err) => err.message);
          req.flash("error", errors.join(", "));
        } else {
          req.flash("error", "An error occurred while updating the service");
        }

        res.redirect("/admin/manageService");
      }
    });
  } catch (error) {
    console.error("Unexpected error in serviceupdatelogic:", error);
    req.flash("error", "An unexpected error occurred");
    res.redirect("/admin/manageService");
  }
};

exports.deleteservice = async (req, res) => {
  const serviceId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    req.flash("error", "Invalid service ID");
    return res.redirect("/admin/manageService");
  }

  try {
    const deletedService = await Service.findByIdAndDelete(serviceId);

    if (!deletedService) {
      req.flash("error", "Service not found");
      return res.redirect("/admin/manageService");
    }

    req.flash("success", "Service removed successfully");
    res.redirect("/admin/manageService");
  } catch (err) {
    console.error("Error deleting service:", err);
    req.flash("error", "Something went wrong");
    res.redirect("/admin/manageService");
  }
};

// Rest of your existing methods remain the same...
exports.assignElectrician = async (req, res) => {
  try {
    const orders = await Order.find({ electrician: null }).populate("user");
    const activeOrders = await Order.find({
      status: { $nin: ["Completed", "Cancelled"] },
      electrician: { $ne: null },
    });
    const busyElectricianIds = activeOrders.map((order) =>
      order.electrician.toString()
    );
    const electricians = await Electrician.find({
      _id: { $nin: busyElectricianIds },
    });
    res.render("admin/pages/assignElectrician.ejs", { orders, electricians });
  } catch (err) {
    console.error("Error loading assign electrician page:", err);
    req.flash("error", "Failed to load assign electrician page");
    res.redirect("/admin/");
  }
};

exports.assignElectricianLogic = async (req, res) => {
  const { orderId, electricianId } = req.body;

  try {
    if (!orderId || !electricianId) {
      req.flash("error", "Order ID and Electrician ID are required");
      return res.redirect("/admin/assignElectrician");
    }

    const order = await Order.findById(orderId);
    const electrician = await Electrician.findById(electricianId);

    if (!order || !electrician) {
      req.flash("error", "Order or Electrician not found");
      return res.redirect("/admin/assignElectrician");
    }

    order.electrician = electrician._id;
    order.status = "Assigned";
    await order.save();

    req.flash("success", "Electrician assigned successfully");
    res.redirect("/admin/assignElectrician");
  } catch (err) {
    console.error("Error assigning electrician:", err);
    req.flash("error", "Failed to assign electrician");
    res.redirect("/admin/assignElectrician");
  }
};

exports.viewOrder = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user")
      .populate("electrician")
      .sort({ createdAt: -1 });
    res.render("admin/pages/viewOrder.ejs", { orders });
  } catch (err) {
    console.error("Error loading orders:", err);
    req.flash("error", "Failed to load orders");
    res.redirect("/admin/");
  }
};

exports.manageOrder = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user")
      .populate("electrician")
      .sort({ createdAt: -1 });
    res.render("admin/pages/manageOrder.ejs", { orders });
  } catch (err) {
    console.error("Error loading orders:", err);
    req.flash("error", "Failed to load orders");
    res.redirect("/admin/");
  }
};

exports.updateOrder = async (req, res) => {
  const { orderId, status } = req.body;

  try {
    if (!orderId || !status) {
      req.flash("error", "Order ID and status are required");
      return res.redirect("/admin/manageOrders");
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      req.flash("error", "Order not found");
      return res.redirect("/admin/manageOrders");
    }

    req.flash("success", "Order status updated successfully");
    res.redirect("/admin/manageOrders");
  } catch (err) {
    console.error("Error updating order status:", err);
    req.flash("error", "Failed to update status");
    res.redirect("/admin/manageOrders");
  }
};
