const axios = require("axios");
const path = require("path");
let express = require("express"); /* Accessing express module */
let app = express(); /* app is a request handler function */
let http = require("http");
let bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

http.createServer(app).listen(4000);
console.log(`Web server started and running at http://localhost:4000`);
process.stdin.setEncoding("utf8");

//database setup
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = {
  db: "CMSC335_DB",
  collection: "campApplicants",
};
const uri = `mongodb+srv://${userName}:${password}@cluster0.2nkpl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//endpoints
app.get("/", (req, res) => {
  axios
    .get("https://restcountries.com/v2/all")
    .then((res) => {
      data = res.data;
      let countryList = "<select name='country'>";
      data.forEach((country) => {
        if (country.name !== "Åland Islands" && country.name !== "Curaçao") {
          countryList += `<option value="${country.name}">${country.name}</option>`;
        }
      });
      countryList += "</select>";
      return countryList;
    })
    .then((countries) => res.render("index", { countries: countries }))
    .catch((err) => {
      console.log(err);
    });
});

app.post("/search", (req, res) => {
  let { country } = req.body;
  axios
    .get(`https://restcountries.com/v2/name/${country}?fullText=true`)
    .then((res) => {
      data = res.data[0];
      let info = {
        country: country,
        capital: data.capital,
        region: data.region,
        subregion: data.subregion,
        population: data.population,
        currency: data.currencies[0].name,
        symbol: data.currencies[0].symbol,
        language: data.languages[0].name,
        native: data.languages[0].nativeName,
        flag: `<img class="flag" src="${data.flag}"/>`,
      };
      return info;
    })
    .then((data) => {
      res.render("countryInfo", data);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/coolness", async (req, res) => {
  let { country } = req.body;
  let filter = { country: country };
  await client.connect();
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .findOne(filter);
  if (result) {
    res.render("coolness.ejs", { score: result.score });
  } else {
    res.render("coolness.ejs", { score: "No score yet" });
  }
  await client.close();
});

app.post("/boost", async (req, res) => {
  let { country } = req.body;
  let filter = { country: country };
  await client.connect();
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .findOne(filter);
  if (!result) {
    await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .insertOne({ country: country, score: 5 })
      .then(() => res.render("success.ejs", { score: 5 }));
  } else {
    await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .updateOne(filter, { $inc: { score: 5 } })
      .then(() => res.render("success.ejs", { score: result.score + 5 }));
  }
  await client.close();
});
