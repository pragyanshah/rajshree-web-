const router     = require("express").Router();
const { getAllProducts, getProductById } = require("../db/database");

/* GET /api/products?category=mobiles&search=samsung
   Optional: ?page=1&limit=48 for server-side pagination.
   Without page/limit the full catalog is returned (current storefront default). */
router.get("/", async (req, res) => {
  try {
    const { category, search, page, limit } = req.query;
    const products = await getAllProducts({ category, search, page, limit });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products." });
  }
});

/* GET /api/products/:id */
router.get("/:id", async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product." });
  }
});

module.exports = router;
