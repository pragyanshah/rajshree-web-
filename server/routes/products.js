const router     = require("express").Router();
const { getAllProducts, getProductById } = require("../db/database");

/* GET /api/products?category=mobiles&search=samsung */
router.get("/", (req, res) => {
  try {
    const { category, search } = req.query;
    const products = getAllProducts({ category, search });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products." });
  }
});

/* GET /api/products/:id */
router.get("/:id", (req, res) => {
  try {
    const product = getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product." });
  }
});

module.exports = router;
