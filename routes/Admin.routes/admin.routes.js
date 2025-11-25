const express = require("express");
const router = express.Router();
const { isAdmin } = require("../../middleware/admin.middleware.js");
// Remove this line - we'll use the enhanced upload from cloudConfig.js
// const multer = require("multer");
// const { storage } = require("../../cloudConfig.js");
// const upload = multer({ storage });

const adminController = require("../../controller/Admin.controller/services.controller.js");

router.get("/login", (req, res) => {
  res.render("admin/pages/login.ejs");
});

router.post("/login", adminController.login);

router.get("/logout", (req, res) => {
  req.session.admin = undefined;
  res.redirect("/admin/login");
});

router.get("/AdminRegister", (req, res) => {
  res.render("admin/pages/register.ejs");
});

router.post("/register", adminController.signup);

router.get("/", isAdmin, adminController.manageHome);
router.get("/manageUser", isAdmin, adminController.manageUser);

router.get("/addElectrician", isAdmin, (req, res) => {
  res.render("admin/pages/addElectrician.ejs");
});

router.post("/addElectrician", isAdmin, adminController.addElectrician);

router.get("/electrician/:id", isAdmin, adminController.updateElectrician);
router.put("/electrician/:id", isAdmin, adminController.updateElectricianlogic);
router.delete("/electrician/:id", isAdmin, adminController.deleteElectrician);

router.get("/manageElectrician", isAdmin, adminController.manageElectrician);

// Fixed category routes - removed the extra parameter
router.get("/addCategory", isAdmin, adminController.addcategoryform);
router.post("/addCategory", isAdmin, adminController.addcategorylogic);

router.get("/manageCategory", isAdmin, adminController.managecategory);

router.get("/deleteCategory/:id", isAdmin, adminController.deletecategory);

// Fixed service routes
router.get("/addService", isAdmin, adminController.addserviceform);
router.post("/addService", isAdmin, adminController.addservicelogic);

router.get("/manageService", isAdmin, adminController.manageservice);

router.get("/service/:id", isAdmin, adminController.serviceupdateform);
router.put("/service/:id", isAdmin, adminController.serviceupdatelogic);
router.delete("/service/:id", isAdmin, adminController.deleteservice);

router.get("/assignElectrician", isAdmin, adminController.assignElectrician);
router.post(
  "/assignElectrician",
  isAdmin,
  adminController.assignElectricianLogic
);

router.get("/viewBooking", isAdmin, adminController.viewOrder);
router.get("/manageOrders", isAdmin, adminController.manageOrder);

router.post("/updateOrder", isAdmin, adminController.updateOrder);

module.exports = router;
