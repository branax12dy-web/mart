import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, bannersTable, flashDealsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { adminAuth } from "./admin.js";

const router: IRouter = Router();

router.use(adminAuth);

const MART_PRODUCTS = [
  { name: "Basmati Rice 5kg",        price: 980,  originalPrice: 1200, category: "fruits",    unit: "5kg bag",    inStock: true,  description: "Premium long-grain basmati rice from AJK farms", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop&auto=format" },
  { name: "Doodh (Fresh Milk) 1L",   price: 140,  originalPrice: null, category: "dairy",     unit: "1 litre",    inStock: true,  description: "Fresh pasteurized milk", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop&auto=format" },
  { name: "Anday (Eggs) 12pc",       price: 320,  originalPrice: 350,  category: "dairy",     unit: "12 pieces",  inStock: true,  description: "Farm fresh eggs", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop&auto=format" },
  { name: "Aata (Wheat Flour) 10kg", price: 1100, originalPrice: 1350, category: "bakery",    unit: "10kg bag",   inStock: true,  description: "Chakki fresh atta", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop&auto=format" },
  { name: "Desi Ghee 1kg",           price: 1800, originalPrice: 2100, category: "dairy",     unit: "1kg tin",    inStock: true,  description: "Pure desi ghee from local farms", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop&auto=format" },
  { name: "Cooking Oil 5L",          price: 1650, originalPrice: 1900, category: "household", unit: "5 litre",    inStock: true,  description: "Refined sunflower oil", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop&auto=format" },
  { name: "Pyaz (Onion) 1kg",        price: 80,   originalPrice: 100,  category: "fruits",    unit: "1kg",        inStock: true,  description: "Fresh onions", image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=400&fit=crop&auto=format" },
  { name: "Tamatar (Tomato) 1kg",    price: 120,  originalPrice: 150,  category: "fruits",    unit: "1kg",        inStock: true,  description: "Fresh red tomatoes", image: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400&h=400&fit=crop&auto=format" },
  { name: "Aloo (Potato) 1kg",       price: 60,   originalPrice: 80,   category: "fruits",    unit: "1kg",        inStock: true,  description: "Fresh potatoes", image: "https://images.unsplash.com/photo-1518977676601-b53f82afe0a7?w=400&h=400&fit=crop&auto=format" },
  { name: "Sabz Mirch 250g",         price: 45,   originalPrice: null, category: "fruits",    unit: "250g",       inStock: true,  description: "Fresh green chillies", image: "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400&h=400&fit=crop&auto=format" },
  { name: "Adrak Lehsun Paste",      price: 95,   originalPrice: null, category: "fruits",    unit: "200g jar",   inStock: true,  description: "Ready-made ginger garlic paste", image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=400&fit=crop&auto=format" },
  { name: "Chicken 1kg",             price: 420,  originalPrice: 480,  category: "meat",      unit: "1kg",        inStock: true,  description: "Fresh broiler chicken", image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop&auto=format" },
  { name: "Gosht (Beef) 500g",       price: 650,  originalPrice: null, category: "meat",      unit: "500g",       inStock: true,  description: "Fresh beef meat", image: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=400&fit=crop&auto=format" },
  { name: "Macchi (Fish) 500g",      price: 380,  originalPrice: null, category: "meat",      unit: "500g",       inStock: true,  description: "Fresh river fish", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop&auto=format" },
  { name: "Murghi ka Doodh 200ml",   price: 75,   originalPrice: null, category: "dairy",     unit: "200ml",      inStock: true,  description: "Flavored milk", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop&auto=format" },
  { name: "Dahi (Yoghurt) 500g",     price: 120,  originalPrice: null, category: "dairy",     unit: "500g",       inStock: true,  description: "Fresh yoghurt", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop&auto=format" },
  { name: "Makkhan (Butter) 200g",   price: 280,  originalPrice: 320,  category: "dairy",     unit: "200g pack",  inStock: true,  description: "Salted butter", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop&auto=format" },
  { name: "Cheese Slices 200g",      price: 350,  originalPrice: null, category: "dairy",     unit: "10 slices",  inStock: true,  description: "Processed cheese slices", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop&auto=format" },
  { name: "Naan (Fresh) 6pc",        price: 80,   originalPrice: null, category: "bakery",    unit: "6 pieces",   inStock: true,  description: "Fresh baked naan", image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=400&fit=crop&auto=format" },
  { name: "Double Roti",             price: 90,   originalPrice: null, category: "bakery",    unit: "1 loaf",     inStock: true,  description: "Sliced bread", image: "https://images.unsplash.com/photo-1549931319-a545753467c8?w=400&h=400&fit=crop&auto=format" },
  { name: "Rusk Biscuits",           price: 120,  originalPrice: null, category: "snacks",    unit: "200g pack",  inStock: true,  description: "Crispy tea rusks", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop&auto=format" },
  { name: "Peek Freans Bisconi",     price: 85,   originalPrice: null, category: "snacks",    unit: "1 pack",     inStock: true,  description: "Chocolate biscuits", image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop&auto=format" },
  { name: "Lays Classic Chips",      price: 65,   originalPrice: null, category: "snacks",    unit: "85g bag",    inStock: true,  description: "Salted potato chips", image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop&auto=format" },
  { name: "Nimco Mix 250g",          price: 110,  originalPrice: null, category: "snacks",    unit: "250g",       inStock: true,  description: "Traditional spicy nimco", image: "https://images.unsplash.com/photo-1599490659213-e2b9527f3b76?w=400&h=400&fit=crop&auto=format" },
  { name: "Pepsi 1.5L",              price: 130,  originalPrice: null, category: "beverages", unit: "1.5 litre",  inStock: true,  description: "Chilled Pepsi", image: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop&auto=format" },
  { name: "Nestle Water 1.5L",       price: 65,   originalPrice: null, category: "beverages", unit: "1.5 litre",  inStock: true,  description: "Pure mineral water", image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop&auto=format" },
  { name: "Tapal Danedar Tea 200g",  price: 280,  originalPrice: 320,  category: "beverages", unit: "200g pack",  inStock: true,  description: "Strong black tea", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop&auto=format" },
  { name: "Nescafe Classic 50g",     price: 380,  originalPrice: null, category: "beverages", unit: "50g jar",    inStock: true,  description: "Instant coffee", image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop&auto=format" },
  { name: "Rooh Afza 800ml",         price: 450,  originalPrice: null, category: "beverages", unit: "800ml",      inStock: true,  description: "Traditional rose drink", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=400&fit=crop&auto=format" },
  { name: "Shampoo (Sunsilk) 180ml", price: 220,  originalPrice: 260,  category: "personal",  unit: "180ml",      inStock: true,  description: "Sunsilk shampoo", image: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop&auto=format" },
  { name: "Surf Excel 1kg",          price: 420,  originalPrice: 480,  category: "household", unit: "1kg box",    inStock: true,  description: "Washing powder", image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400&h=400&fit=crop&auto=format" },
  { name: "Dettol Soap 3pc",         price: 180,  originalPrice: 210,  category: "personal",  unit: "3 bars",     inStock: true,  description: "Antibacterial soap", image: "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=400&h=400&fit=crop&auto=format" },
  { name: "Colgate Toothpaste",      price: 140,  originalPrice: null, category: "personal",  unit: "100g tube",  inStock: true,  description: "Cavity protection", image: "https://images.unsplash.com/photo-1628359355624-855775b5c9c4?w=400&h=400&fit=crop&auto=format" },
  { name: "Tissue Rolls 6pc",        price: 250,  originalPrice: null, category: "household", unit: "6 rolls",    inStock: true,  description: "Soft bathroom tissue", image: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&h=400&fit=crop&auto=format" },
  { name: "Dishwash Bar",            price: 45,   originalPrice: null, category: "household", unit: "1 bar",      inStock: true,  description: "Vim dishwash bar", image: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400&h=400&fit=crop&auto=format" },
  { name: "Ketchup 800g",            price: 220,  originalPrice: 260,  category: "household", unit: "800g bottle",inStock: true,  description: "Heinz tomato ketchup", image: "https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=400&h=400&fit=crop&auto=format" },
  { name: "Soya Sauce 300ml",        price: 110,  originalPrice: null, category: "household", unit: "300ml",      inStock: true,  description: "Dark soya sauce", image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=400&fit=crop&auto=format" },
  { name: "Sabzi Mix Masala 50g",    price: 75,   originalPrice: null, category: "household", unit: "50g",        inStock: true,  description: "Mixed vegetable spices", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop&auto=format" },
  { name: "Shan Biryani Masala",     price: 85,   originalPrice: null, category: "household", unit: "60g pack",   inStock: true,  description: "Biryani spice mix", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop&auto=format" },
  { name: "Mango 1kg",               price: 180,  originalPrice: null, category: "fruits",    unit: "1kg",        inStock: true,  description: "Fresh sweet mangoes", image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=400&fit=crop&auto=format" },
  { name: "Kela (Banana) 12pc",      price: 90,   originalPrice: null, category: "fruits",    unit: "12 pieces",  inStock: true,  description: "Fresh bananas", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop&auto=format" },
  { name: "Seb (Apple) 500g",        price: 140,  originalPrice: null, category: "fruits",    unit: "500g",       inStock: true,  description: "Fresh apples", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop&auto=format" },
];

const FOOD_PRODUCTS = [
  { name: "Chicken Biryani",         price: 280, originalPrice: null,  category: "desi",       unit: "1 plate",    inStock: true,  description: "Aromatic spiced biryani with raita", rating: 4.8, deliveryTime: "25-35 min", vendorName: "Biryani House AJK", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=400&fit=crop&auto=format" },
  { name: "Beef Nihari",             price: 320, originalPrice: null,  category: "desi",       unit: "1 portion",  inStock: true,  description: "Slow-cooked beef with rich gravy + naan", rating: 4.9, deliveryTime: "30-40 min", vendorName: "Desi Dhaba", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=400&fit=crop&auto=format" },
  { name: "Chicken Karahi",          price: 450, originalPrice: 500,   category: "desi",       unit: "2 portions", inStock: true,  description: "Wok-cooked chicken with tomatoes & spices", rating: 4.7, deliveryTime: "25-35 min", vendorName: "Desi Dhaba", image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=400&fit=crop&auto=format" },
  { name: "Dal Makhani",             price: 180, originalPrice: null,  category: "desi",       unit: "1 portion",  inStock: true,  description: "Creamy black lentil dal + naan", rating: 4.6, deliveryTime: "20-30 min", vendorName: "Biryani House AJK", image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=400&fit=crop&auto=format" },
  { name: "Lamb Sajji",              price: 550, originalPrice: 600,   category: "desi",       unit: "half leg",   inStock: true,  description: "Balochi-style whole roasted lamb", rating: 4.9, deliveryTime: "45-60 min", vendorName: "Sajji Palace", image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop&auto=format" },
  { name: "Chicken Tikka",           price: 380, originalPrice: null,  category: "restaurants",unit: "6 pieces",   inStock: true,  description: "Tandoor-grilled marinated chicken", rating: 4.8, deliveryTime: "30-40 min", vendorName: "Grill House Muzaffarabad", image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=400&fit=crop&auto=format" },
  { name: "Seekh Kabab",             price: 250, originalPrice: null,  category: "restaurants",unit: "4 pieces",   inStock: true,  description: "Minced beef kabab off the grill + chutney", rating: 4.7, deliveryTime: "20-30 min", vendorName: "Grill House Muzaffarabad", image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=400&fit=crop&auto=format" },
  { name: "Paye (Trotters Soup)",    price: 220, originalPrice: null,  category: "desi",       unit: "1 bowl",     inStock: true,  description: "Slow-cooked goat trotters with naan", rating: 4.8, deliveryTime: "35-45 min", vendorName: "Desi Dhaba", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=400&fit=crop&auto=format" },
  { name: "Chappal Kabab Roll",      price: 150, originalPrice: null,  category: "fast-food",  unit: "1 roll",     inStock: true,  description: "Crispy chappal kabab in paratha with salad", rating: 4.6, deliveryTime: "15-25 min", vendorName: "Fast Food Corner", image: "https://images.unsplash.com/photo-1561758033-7e924f619b47?w=400&h=400&fit=crop&auto=format" },
  { name: "Chicken Broast",          price: 350, originalPrice: 400,   category: "fast-food",  unit: "4 pieces",   inStock: true,  description: "Crispy pressure-fried chicken + fries + sauce", rating: 4.7, deliveryTime: "20-30 min", vendorName: "Fast Food Corner", image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=400&fit=crop&auto=format" },
  { name: "Zinger Burger",           price: 220, originalPrice: 250,   category: "fast-food",  unit: "1 burger",   inStock: true,  description: "Crispy chicken fillet burger with special sauce", rating: 4.5, deliveryTime: "15-25 min", vendorName: "Burger Point AJK", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop&auto=format" },
  { name: "Double Beef Burger",      price: 280, originalPrice: null,  category: "fast-food",  unit: "1 burger",   inStock: true,  description: "Double patty beef burger with fries", rating: 4.6, deliveryTime: "20-30 min", vendorName: "Burger Point AJK", image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=400&fit=crop&auto=format" },
  { name: "Loaded Fries",            price: 180, originalPrice: null,  category: "fast-food",  unit: "1 box",      inStock: true,  description: "Crispy fries with cheese sauce & jalapenos", rating: 4.4, deliveryTime: "15-20 min", vendorName: "Burger Point AJK", image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop&auto=format" },
  { name: "Chowmein Noodles",        price: 200, originalPrice: null,  category: "chinese",    unit: "1 plate",    inStock: true,  description: "Stir-fried noodles with vegetables & chicken", rating: 4.5, deliveryTime: "25-35 min", vendorName: "China Town AJK", image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop&auto=format" },
  { name: "Chicken Manchurian",      price: 280, originalPrice: null,  category: "chinese",    unit: "1 portion",  inStock: true,  description: "Crispy chicken in tangy manchurian sauce", rating: 4.6, deliveryTime: "25-35 min", vendorName: "China Town AJK", image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&h=400&fit=crop&auto=format" },
  { name: "Fried Rice",              price: 180, originalPrice: null,  category: "chinese",    unit: "1 plate",    inStock: true,  description: "Egg fried rice with mixed vegetables", rating: 4.4, deliveryTime: "20-30 min", vendorName: "China Town AJK", image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=400&fit=crop&auto=format" },
  { name: "Chicken Shawarma",        price: 160, originalPrice: null,  category: "restaurants",unit: "1 roll",     inStock: true,  description: "Lebanese-style chicken wrap with garlic sauce", rating: 4.7, deliveryTime: "15-20 min", vendorName: "Shawarma House", image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=400&fit=crop&auto=format" },
  { name: "Beef Shawarma",           price: 180, originalPrice: null,  category: "restaurants",unit: "1 roll",     inStock: true,  description: "Spiced beef shawarma with fresh vegetables", rating: 4.8, deliveryTime: "15-20 min", vendorName: "Shawarma House", image: "https://images.unsplash.com/photo-1561758033-7e924f619b47?w=400&h=400&fit=crop&auto=format" },
  { name: "Chicken Pizza 8''",       price: 450, originalPrice: 500,   category: "pizza",      unit: "8 inch",     inStock: true,  description: "Thin crust with chicken tikka & cheese", rating: 4.6, deliveryTime: "30-45 min", vendorName: "Pizza Palace AJK", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop&auto=format" },
  { name: "Beef Pepperoni Pizza",    price: 520, originalPrice: null,  category: "pizza",      unit: "8 inch",     inStock: true,  description: "Classic pepperoni pizza with extra cheese", rating: 4.7, deliveryTime: "30-45 min", vendorName: "Pizza Palace AJK", image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=400&fit=crop&auto=format" },
  { name: "Gulab Jamun 6pc",         price: 120, originalPrice: null,  category: "desserts",   unit: "6 pieces",   inStock: true,  description: "Soft milk-solid dumplings in sugar syrup", rating: 4.9, deliveryTime: "15-25 min", vendorName: "Mithai House", image: "https://images.unsplash.com/photo-1666190053473-c8d3f6f93b09?w=400&h=400&fit=crop&auto=format" },
  { name: "Kheer",                   price: 100, originalPrice: null,  category: "desserts",   unit: "1 bowl",     inStock: true,  description: "Creamy rice pudding with cardamom", rating: 4.8, deliveryTime: "20-30 min", vendorName: "Mithai House", image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=400&fit=crop&auto=format" },
  { name: "Shahi Tukray",            price: 150, originalPrice: null,  category: "desserts",   unit: "2 pieces",   inStock: true,  description: "Fried bread in sweetened cream & dry fruits", rating: 4.9, deliveryTime: "20-30 min", vendorName: "Mithai House", image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop&auto=format" },
  { name: "Waffles with Ice Cream",  price: 250, originalPrice: null,  category: "desserts",   unit: "1 plate",    inStock: true,  description: "Belgian waffles + 2 scoops ice cream", rating: 4.7, deliveryTime: "20-30 min", vendorName: "Cafe AJK", image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&h=400&fit=crop&auto=format" },
  { name: "Halwa Puri (Breakfast)",  price: 180, originalPrice: null,  category: "desi",       unit: "1 set",      inStock: true,  description: "Sooji halwa + 2 puri + chana + achar", rating: 4.8, deliveryTime: "20-30 min", vendorName: "Biryani House AJK", image: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=400&fit=crop&auto=format" },
];

const DEMO_BANNERS = [
  { title: "Free Delivery", subtitle: "On orders above Rs. 500", colorFrom: "#0047B3", colorTo: "#0066FF", icon: "bicycle", placement: "home", sortOrder: 1, linkType: "service", linkValue: "mart", targetService: "mart" },
  { title: "Flash Sale Live!", subtitle: "Up to 40% off on groceries", colorFrom: "#E53E3E", colorTo: "#FC8181", icon: "flash", placement: "home", sortOrder: 2, linkType: "route", linkValue: "/mart", targetService: "mart" },
  { title: "New Restaurants", subtitle: "Order from 10+ new restaurants", colorFrom: "#DD6B20", colorTo: "#F6AD55", icon: "restaurant", placement: "home", sortOrder: 3, linkType: "service", linkValue: "food", targetService: "food" },
  { title: "Ride & Save", subtitle: "Book rides at lowest fares", colorFrom: "#38A169", colorTo: "#68D391", icon: "car", placement: "home", sortOrder: 4, linkType: "service", linkValue: "ride", targetService: "ride" },
];

router.post("/products", async (req, res) => {
  const existingMart = await db.select().from(productsTable).where(eq(productsTable.type, "mart")).limit(1);
  const existingFood = await db.select().from(productsTable).where(eq(productsTable.type, "food")).limit(1);

  let seededMart = 0;
  let seededFood = 0;

  if (existingMart.length === 0) {
    for (const p of MART_PRODUCTS) {
      await db.insert(productsTable).values({
        id: generateId(),
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        originalPrice: p.originalPrice ? p.originalPrice.toString() : null,
        category: p.category,
        type: "mart",
        vendorId: "ajkmart_system",
        vendorName: "AJKMart Store",
        unit: p.unit,
        inStock: p.inStock,
        image: p.image,
        images: [p.image],
        rating: (3.8 + Math.random() * 1.1).toFixed(1),
        reviewCount: Math.floor(Math.random() * 200) + 10,
      });
      seededMart++;
    }
  } else {
    for (const p of MART_PRODUCTS) {
      await db.update(productsTable)
        .set({ image: p.image, images: [p.image] })
        .where(eq(productsTable.name, p.name));
    }
  }

  if (existingFood.length === 0) {
    for (const p of FOOD_PRODUCTS) {
      await db.insert(productsTable).values({
        id: generateId(),
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        originalPrice: p.originalPrice ? p.originalPrice.toString() : null,
        category: p.category,
        type: "food",
        vendorId: "ajkmart_system",
        unit: p.unit,
        inStock: p.inStock,
        image: p.image,
        images: [p.image],
        rating: (p.rating || 4.5).toString(),
        reviewCount: Math.floor(Math.random() * 500) + 50,
        vendorName: p.vendorName || "Restaurant AJK",
        deliveryTime: p.deliveryTime || "25-35 min",
      });
      seededFood++;
    }
  } else {
    for (const p of FOOD_PRODUCTS) {
      await db.update(productsTable)
        .set({ image: p.image, images: [p.image] })
        .where(eq(productsTable.name, p.name));
    }
  }

  let seededBanners = 0;
  const existingBanners = await db.select().from(bannersTable).limit(1);
  if (existingBanners.length === 0) {
    for (const b of DEMO_BANNERS) {
      await db.insert(bannersTable).values({
        id: generateId(),
        ...b,
      });
      seededBanners++;
    }
  }

  let seededDeals = 0;
  const existingDeals = await db.select().from(flashDealsTable).limit(1);
  if (existingDeals.length === 0) {
    const allProducts = await db.select().from(productsTable).limit(100);
    const discountProducts = allProducts.filter(p => p.originalPrice && Number(p.originalPrice) > Number(p.price));
    for (const p of discountProducts.slice(0, 8)) {
      const origPrice = Number(p.originalPrice);
      const salePrice = Number(p.price);
      const pct = Math.round(((origPrice - salePrice) / origPrice) * 100);
      await db.insert(flashDealsTable).values({
        id: generateId(),
        productId: p.id,
        title: `${pct}% OFF ${p.name}`,
        badge: "FLASH",
        discountPct: pct.toString(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        dealStock: 50,
        isActive: true,
      });
      seededDeals++;
    }
  }

  res.json({
    success: true,
    seeded: { mart: seededMart, food: seededFood, banners: seededBanners, deals: seededDeals },
    message: `Seeded: ${seededMart} mart, ${seededFood} food, ${seededBanners} banners, ${seededDeals} deals`,
  });
});

export default router;
