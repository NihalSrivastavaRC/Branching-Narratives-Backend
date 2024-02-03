require("dotenv").config();

const express = require("express");
var cors = require('cors')
const mongoose = require("mongoose");
const bodyParser = require('body-parser');

const routes = require("./routes");

const mongoString = process.env.DATABASE_URL;

mongoose.connect(mongoString);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", () => {
  console.log("Database Connected");
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/', routes);

app.listen(3001, () => {
  console.log(`Server Started at ${3001}`);
});