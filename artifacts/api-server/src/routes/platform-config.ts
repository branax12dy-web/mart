import { Router, type IRouter } from "express";
import { getPlatformSettings } from "./admin.js";

const router: IRouter = Router();

// Public endpoint — user app fetches delivery fees and config
router.get("/", async (_req, res) => {
  const settings = await getPlatformSettings();
  res.json({
    deliveryFee: {
      mart:     parseFloat(settings["delivery_fee_mart"] ?? "80"),
      food:     parseFloat(settings["delivery_fee_food"] ?? "60"),
      pharmacy: parseFloat(settings["delivery_fee_pharmacy"] ?? "50"),
      parcel:   parseFloat(settings["delivery_fee_parcel"] ?? "100"),
    },
    rides: {
      bikeBaseFare: parseFloat(settings["ride_bike_base_fare"] ?? "15"),
      bikePerKm:    parseFloat(settings["ride_bike_per_km"] ?? "8"),
      carBaseFare:  parseFloat(settings["ride_car_base_fare"] ?? "25"),
      carPerKm:     parseFloat(settings["ride_car_per_km"] ?? "12"),
    },
    platform: {
      commissionPct:   parseFloat(settings["platform_commission_pct"] ?? "10"),
      minOrderAmount:  parseFloat(settings["min_order_amount"] ?? "100"),
      maxCodAmount:    parseFloat(settings["max_cod_amount"] ?? "5000"),
      freeDeliveryAbove: parseFloat(settings["free_delivery_above"] ?? "1000"),
      appName:         settings["app_name"] ?? "AJKMart",
      supportPhone:    settings["support_phone"] ?? "03001234567",
      appStatus:       settings["app_status"] ?? "active",
    },
  });
});

export default router;
