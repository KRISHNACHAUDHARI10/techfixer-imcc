const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    category_name: {
      type: String,
      unique: [true, "Category already exists!"],
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters long"],
      maxlength: [50, "Category name must not exceed 50 characters"],
    },
    category_image: {
      type: String,
      required: [true, "Category image is required"],
    },
  },
  {
    timestamps: true, // This adds createdAt and updatedAt fields automatically
  }
);

// Add index for better query performance
schema.index({ category_name: 1 });

const Category = mongoose.model("Category", schema);
module.exports = Category;
