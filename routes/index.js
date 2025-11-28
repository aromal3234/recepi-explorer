const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");

const User = require("../models/User");
const Favorite = require("../models/Favorite");

const router = express.Router();

//  MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/recipesDB")
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.log(err));

// MIDDLEWARE: Check Login
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// Middleware to set favorite count for navbar
const { Types } = require('mongoose');
router.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    let userId = req.session.userId;
    // Convert to ObjectId if needed
    if (typeof userId === 'string' && Types.ObjectId.isValid(userId)) {
      userId = new Types.ObjectId(userId);
    }
    const count = await Favorite.countDocuments({ userId });
    res.locals.favoriteCount = count;
  } else {
    res.locals.favoriteCount = 0;
  }
  next();
});

//  SIGNUP PAGE
router.get("/signup", (req, res) => {
  res.render("signup");
});

//  SIGNUP POST
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  const normalizedEmail = (email || "").trim().toLowerCase();
  const hash = await bcrypt.hash(password, 10);

  await User.create({ username, email: normalizedEmail, password: hash });
  res.redirect("/");
});

// LOGIN PAGE
router.get("/login", (req, res) => {
  res.render("login");
});

//  LOGIN POST
router.post("/login", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password;

  const user = await User.findOne({ email });
  if (!user) return res.render("login", { error: "User not found", email });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.render("login", { error: "Incorrect password", email });

  req.session.userId = user._id;
  res.redirect("/");
});

//  LOGOUT
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// HOME PAGE (Search + Combined Results)
router.get("/", async (req, res) => {
  const q = req.query.q || "";

  try {
    //  Fetch from API
    const apiResponse = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`
    );
    const apiMeals = apiResponse.data.meals || [];

    res.render("index", { title: "Recipe Explorer", q, results: apiMeals });
  } catch (err) {
    console.error(err);
    res.render("index", { title: "Recipe Explorer", q, results: [] });
  }
});

//  SEARCH PAGE (Logged In)
router.post("/search", requireLogin, async (req, res) => {
  const query = req.body.query;
  const response = await axios.get(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`
  );
  res.render("results", { meals: response.data.meals });
});

//  RECIPE DETAILS PAGE (with favorite status)
router.get("/recipe/:id", async (req, res) => {
  const id = req.params.id;
  let isFavorite = false;
  let userId = req.session && req.session.userId;
  let favorite = null;
  try {
    const apiResponse = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
    );
    const meal = apiResponse.data.meals?.[0];
    if (!meal) return res.status(404).send("Recipe not found");
    if (userId) {
      favorite = await Favorite.findOne({ recipeId: id, userId });
      isFavorite = !!favorite;
    }
    res.render("recipe", { meal, isFavorite });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching recipe");
  }
});

// ADD FAVORITE
router.post("/favorite", requireLogin, async (req, res) => {
  const { id, name, image } = req.body;
  const userId = req.session.userId;
  // Prevent duplicate favorites
  const exists = await Favorite.findOne({ recipeId: id, userId });
  if (!exists) {
    await Favorite.create({ recipeId: id, name, image, userId });
  }
  res.redirect("/favorites");
});

// REMOVE FAVORITE
router.post("/unfavorite", requireLogin, async (req, res) => {
  const { id } = req.body;
  const userId = req.session.userId;
  await Favorite.deleteOne({ recipeId: id, userId });
  res.redirect("back");
});

// VIEW FAVORITES
router.get("/favorites", requireLogin, async (req, res) => {
  const favorites = await Favorite.find({ userId: req.session.userId });
  res.render("favorites", { favorites });
});

// SUGGESTIONS API
router.get("/api/suggest", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ suggestions: [] });

  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`
    );
    const meals = response.data.meals || [];

    const external = meals.slice(0, 10).map((m) => ({
      id: m.idMeal,
      title: m.strMeal,
      thumb: m.strMealThumb,
    }));

    const all = external;

    const seen = new Set();
    const suggestions = [];

    for (const item of all) {
      const t = (item.title || "").toLowerCase();
      if (!seen.has(t)) {
        seen.add(t);
        suggestions.push(item);
      }
      if (suggestions.length >= 10) break;
    }

    res.json({ suggestions });
  } catch (err) {
    console.error(err);
    res.json({ suggestions: [] });
  }
});

module.exports = router;
