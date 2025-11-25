// cloudConfig.js - Fixed version
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary connected successfully:", result);
    return true;
  } catch (error) {
    console.log("❌ Cloudinary connection failed:", error.message);
    return false;
  }
};

// Enhanced error handling function
const handleMulterError = (error, req, res, next) => {
  console.error("Multer error details:", {
    message: error.message,
    code: error.code,
    field: error.field,
    storageErrors: error.storageErrors || [],
  });

  // Create user-friendly error message
  let userMessage = "Upload failed. Please try again.";

  if (error.message.includes("Unexpected end of form")) {
    userMessage =
      "Form data incomplete. Please check your internet connection and try again.";
  } else if (error.code === "LIMIT_FILE_SIZE") {
    userMessage = "File size too large. Please select a smaller image.";
  } else if (error.code === "LIMIT_FILE_COUNT") {
    userMessage = "Too many files. Please select only one image.";
  } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
    userMessage = "Invalid file field. Please use the correct form field.";
  } else if (error.message.includes("Invalid image file")) {
    userMessage = "Please select a valid image file (JPG, PNG, or GIF).";
  }

  // Add user-friendly message to error object
  error.userMessage = userMessage;
  return error;
};

// Category storage configuration
const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "techfixer/categories",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [
      { width: 500, height: 500, crop: "limit" },
      { quality: "auto:good" },
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split(".")[0];
      return `category_${originalName}_${timestamp}`;
    },
  },
});

// Service storage configuration
const serviceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "techfixer/services",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [
      { width: 800, height: 600, crop: "limit" },
      { quality: "auto:good" },
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split(".")[0];
      return `service_${originalName}_${timestamp}`;
    },
  },
});

// Enhanced file filter function
const fileFilter = (req, file, cb) => {
  console.log("File filter check:", {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  // Check file type
  if (!file.mimetype.startsWith("image/")) {
    const error = new Error("Please select an image file");
    error.code = "INVALID_FILE_TYPE";
    return cb(error, false);
  }

  // Check specific image types
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error("Only JPG, PNG, and GIF files are allowed");
    error.code = "INVALID_FILE_TYPE";
    return cb(error, false);
  }

  cb(null, true);
};

// Category upload configuration
const categoryUpload = multer({
  storage: categoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    fieldSize: 10 * 1024 * 1024, // 10MB for form fields
    fieldNameSize: 255, // Field name size
    fields: 10, // Number of non-file fields
    files: 1, // Only 1 file
  },
  // Add timeout handling
  preservePath: false,
}).single("category_image");

// Service upload configuration
const serviceUpload = multer({
  storage: serviceStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    fieldSize: 10 * 1024 * 1024, // 10MB for form fields
    fieldNameSize: 255,
    fields: 15, // More fields for service form
    files: 1,
  },
  preservePath: false,
}).single("service_image");

// Enhanced wrapper functions with better error handling
const categoryUploadWrapper = (req, res, next) => {
  console.log("Starting category upload...");
  console.log("Request headers:", {
    "content-type": req.headers["content-type"],
    "content-length": req.headers["content-length"],
  });

  categoryUpload(req, res, (err) => {
    if (err) {
      const enhancedError = handleMulterError(err, req, res, next);
      return next(enhancedError);
    }

    console.log("Category upload successful:", {
      file: req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
          }
        : "No file",
      body: req.body,
    });

    next();
  });
};

const serviceUploadWrapper = (req, res, next) => {
  console.log("Starting service upload...");
  console.log("Request headers:", {
    "content-type": req.headers["content-type"],
    "content-length": req.headers["content-length"],
  });

  serviceUpload(req, res, (err) => {
    if (err) {
      const enhancedError = handleMulterError(err, req, res, next);
      return next(enhancedError);
    }

    console.log("Service upload successful:", {
      file: req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
          }
        : "No file",
      body: req.body,
    });

    next();
  });
};

module.exports = {
  categoryUpload: categoryUploadWrapper,
  serviceUpload: serviceUploadWrapper,
  testCloudinaryConnection,
  cloudinary,
};
