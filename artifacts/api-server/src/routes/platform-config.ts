import { Router, type IRouter } from "express";
import { getPlatformSettings } from "./admin.js";

const router: IRouter = Router();

// Public endpoint — all client apps fetch this for config + feature flags
router.get("/", async (_req, res) => {
  const s = await getPlatformSettings();

  res.json({
    deliveryFee: {
      mart:     parseFloat(s["delivery_fee_mart"]     ?? "80"),
      food:     parseFloat(s["delivery_fee_food"]     ?? "60"),
      pharmacy: parseFloat(s["delivery_fee_pharmacy"] ?? "50"),
      parcel:   parseFloat(s["delivery_fee_parcel"]   ?? "100"),
    },
    rides: {
      bikeBaseFare: parseFloat(s["ride_bike_base_fare"] ?? "15"),
      bikePerKm:    parseFloat(s["ride_bike_per_km"]    ?? "8"),
      carBaseFare:  parseFloat(s["ride_car_base_fare"]  ?? "25"),
      carPerKm:     parseFloat(s["ride_car_per_km"]     ?? "12"),
    },
    platform: {
      commissionPct:     parseFloat(s["platform_commission_pct"] ?? "10"),
      minOrderAmount:    parseFloat(s["min_order_amount"]         ?? "100"),
      maxCodAmount:      parseFloat(s["max_cod_amount"]           ?? "5000"),
      freeDeliveryAbove: parseFloat(s["free_delivery_above"]      ?? "1000"),
      appName:           s["app_name"]     ?? "AJKMart",
      supportPhone:      s["support_phone"] ?? "03001234567",
      appStatus:         s["app_status"]   ?? "active",
    },
    features: {
      mart:         (s["feature_mart"]          ?? "on") === "on",
      food:         (s["feature_food"]          ?? "on") === "on",
      rides:        (s["feature_rides"]         ?? "on") === "on",
      pharmacy:     (s["feature_pharmacy"]      ?? "on") === "on",
      parcel:       (s["feature_parcel"]        ?? "on") === "on",
      wallet:       (s["feature_wallet"]        ?? "on") === "on",
      referral:     (s["feature_referral"]      ?? "on") === "on",
      newUsers:     (s["feature_new_users"]     ?? "on") === "on",
      chat:         (s["feature_chat"]          ?? "off") === "on",
      liveTracking: (s["feature_live_tracking"] ?? "on") === "on",
      reviews:      (s["feature_reviews"]       ?? "on") === "on",
    },
    content: {
      banner:          s["content_banner"]          ?? "Free delivery on your first order! 🎉",
      announcement:    s["content_announcement"]    ?? "",
      maintenanceMsg:  s["content_maintenance_msg"] ?? "We're performing scheduled maintenance. Back soon!",
      supportMsg:      s["content_support_msg"]     ?? "Need help? Chat with us!",
      tncUrl:          s["content_tnc_url"]         ?? "",
      privacyUrl:      s["content_privacy_url"]     ?? "",
    },
    security: {
      gpsTracking:  (s["security_gps_tracking"]  ?? "on") === "on",
      otpBypass:    (s["security_otp_bypass"]    ?? "off") === "on",
      sessionDays:  parseInt(s["security_session_days"] ?? "30"),
      rateLimit:    parseInt(s["security_rate_limit"]   ?? "100"),
      smsGateway:   s["api_sms_gateway"] ?? "console",
      mapKeySet:    (s["api_map_key"] ?? "") !== "",
      firebaseSet:  (s["api_firebase_key"] ?? "") !== "",
    },
    integrations: {
      payment:       (s["integration_payment"]    ?? "off") === "on",
      pushNotif:     (s["integration_push_notif"] ?? "off") === "on",
      analytics:     (s["integration_analytics"]  ?? "off") === "on",
      email:         (s["integration_email"]      ?? "off") === "on",
      sentry:        (s["integration_sentry"]     ?? "off") === "on",
      whatsapp:      (s["integration_whatsapp"]   ?? "off") === "on",
    },
  });
});

export default router;
