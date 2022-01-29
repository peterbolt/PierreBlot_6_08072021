const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user");
const saucesRoutes = require("./routes/sauces");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");

const dotenv = require("dotenv");
const result = dotenv.config();

const app = express();

const client = require("redis").createClient();
var limiter = require("express-limiter")(app, client);

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("Connexion à MongoDB réussie !"))
  .catch(() => console.log("Connexion à MongoDB échouée !"));

app.use(express.json());

app.use(morgan("dev"));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});
// app.use(helmet());
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use("/images", express.static(path.join(__dirname, "images")));

app.use("/api/sauces", saucesRoutes);
app.use("/api/auth", userRoutes);

// Limite la connexion par adresse IP
limiter({
  path: "/api",
  method: "get",
  lookup: ["connection.remoteAddress"],
  // 150 requests per hour
  total: 150,
  expire: 1000 * 60 * 60,
});

app.get("/api", function (req, res) {
  res.send(200, "ok");
});

module.exports = app;

mongoose.set("debug", true);
