const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors({}));

mongoose
  .connect("mongodb://127.0.0.1:27017/marketplace_db")
  .then(() => console.log("Connecté à MongoDB !"))
  .catch((err) => console.log("Erreur de connexion :", err));

const CategoriesSchema = new mongoose.Schema({
  nom: { type: String, required: true },
});

const ProductsSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prix: { type: Number, required: true },
  stock: { type: Number, required: true },
  categorie: { type: mongoose.Schema.Types.ObjectId, ref: "Categories" },
});

const UsersSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: Boolean, required: true },
});

const ReviewsSchema = new mongoose.Schema({
  commentaire: { type: String, required: false },
  note: { type: Number, required: true },
  produit: { type: mongoose.Schema.Types.ObjectId, ref: "Products" },
  auteur: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
});

const Categories = mongoose.model("Categories", CategoriesSchema);
const Products = mongoose.model("Products", ProductsSchema);
const Users = mongoose.model("Users", UsersSchema);
const Reviews = mongoose.model("Reviews", ReviewsSchema);

// ----- GESTION DU CATALOG ------

app.get("/api/products", async (req, res) => {
  try {
    const allProduct = await Products.find().populate("categorie");
    res.json(allProduct);
  } catch {
    res.status(500).json({ error: "Impossible de récupérer les produits" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    if (req.body.prix < 0) {
      return res.status(400).json({ error: "Le prix doit être positif" });
    }

    const newCategory = new Categories(req.body.categorie);
    const saveCategory = await newCategory.save();

    const newProduct = new Products({
      nom: req.body.nom,
      prix: req.body.prix,
      stock: req.body.stock,
      categorie: saveCategory._id,
    });
    const saveProduct = await newProduct.save();

    res.status(201).json(saveProduct);
  } catch (err) {
    res.status(500).json(`Impossible de créer le produit ${err}`);
  }
});

// ---- SYSTEM D'AVIS ----

app.post("/api/reviews", async (req, res) => {
  try {
    if (req.body.note < 0 || req.body.note > 5) {
      return res.status(400).json({ error: "La note est entre 0 et 5" });
    }
    const newReview = new Reviews({
      commentaire: req.body.commentaire,
      note: req.body.note,
      produit: req.body.produit,
      auteur: req.body.auteur,
    });
    const saveReview = await newReview.save();
    res.status(201).json(saveReview);
  } catch (err) {
    res.status(500).json("Impossible de créer l'avis");
  }
});

app.get("/api/reviews/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const allReviews = await Reviews.findOne({ produit: productId })
      .populate("auteur", "username")
      .populate("produit", "nom");
    console.log(allReviews);
    res.json(allReviews);
  } catch {
    res.status(500).json({ error: "Impossible d'afficher les avis" });
  }
});

// ---- GESTION USER ----

app.post("/api/users", async (req, res) => {
  try {
    const newUser = new Users({
      username: req.body.username,
      email: req.body.email,
      role: req.body.role,
    });

    const saveUser = await newUser.save();
    res.status(201).json(saveUser);
  } catch {
    res.status(500).json({ error: "Impossible d'ajouter un user" });
  }
});

// ---- DELETE ----

app.delete("/api/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const reqUser = req.headers["x-admin"];
    const user = await Users.findOne({ username: reqUser });

    if (user.role === true) {
      await Reviews.deleteMany({ produit: productId });
      await Products.findByIdAndDelete(productId);

      res
        .status(200)
        .json({ message: "Produit supprimer avec toutes ses reviews" });
    } else {
      res.status(400).json("L'utilisateur n'a pas le droit de supprimer");
    }
  } catch {
    res.status(500).json({ error: "Impossible de supprimer le produit" });
  }
});

app.listen(3000, () => {
  console.log("Serveur démarré sur le port 3000");
});
