const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// middlewares
app.use(
  cors({
    origin: [
      "*",
      "http://localhost:5173",
      "https://encyclopaedia-97061.web.app",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Not Authorized" });
  }
  try {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "Not Authorized" });
      }
      console.log("decoded", decoded);
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error verifying token" });
  }
};

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.kx7txjc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("booksDB");

    const bookCollection = database.collection("books");
    const borrowedCollection = database.collection("borrowedBooks");
    const categoryCollection = database.collection("categories");

    // Authentication
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      try {
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1hr",
        });
        res
          .cookie("token", token, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
          })
          .send({ message: "Token generated Successfully." });
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Token generating failed." });
      }
    });

    //   routes
    app.get("/allBook", verifyToken, async (req, res) => {
      // console.log("token", req.cookies?.token);
      // console.log("user in allBook", req.user);
      try {
        const result = await bookCollection.find().toArray();
        res.status(200).send(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error Fetching Books" });
      }
    });

    app.post("/allBook", async (req, res) => {
      const book = req.body;
      try {
        const result = await bookCollection.insertOne(book);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error on Creating New Book!!!" });
      }
    });

    app.get("/books/:category", async (req, res) => {
      const category = req.params?.category;
      const filter = { category: category };
      try {
        const result = await bookCollection.find(filter).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error Fetching Category Books" });
      }
    });

    app.patch("/allBook/update/:id", async (req, res) => {
      const bookId = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(bookId) };
      const updatedBook = {
        $set: {
          ...body,
        },
      };
      try {
        const result = await bookCollection.updateOne(filter, updatedBook);
        res.send(result);
        // res.send({ message: "testing" });
      } catch (error) {
        console.log(error);
        res
          .status(501)
          .json({ message: "Error Updating Data. Server Error Occurred!" });
      }
    });

    app.delete("/allBook", verifyToken, async (req, res) => {
      const email = req.query?.email;
      const bookId = req.query?.bookId;
      const query = { email: email, bookId: bookId };

      if (req.query?.email !== req.user?.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      try {
        const result = await borrowedCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(501)
          .json({ message: "Error Deleting Book. Server Error Occurred!" });
      }
    });

    app.get("/categories", async (req, res) => {
      try {
        const categories = await categoryCollection.find().toArray();
        res.send(categories);
      } catch (error) {
        console.log(error);
        res.status(501).json({
          message: "Error getting Categories. Server Error Occurred!",
        });
      }
    });

    app.get("/bestSellers", async (req, res) => {
      const query = { tags: "best seller" };
      try {
        const bestSellers = await bookCollection.find(query).toArray();
        res.send(bestSellers);
      } catch (error) {
        console.log(error);
        res.status(501).json({
          message: "Error getting Best Selling Books. Server Error Occurred!",
        });
      }
    });

    app.post("/allBorrowedBooksId", async (req, res) => {
      const bookIds = req.body?.ids;
      // console.log(bookIds);

      const booksObjectId = bookIds?.map((bookId) => new ObjectId(bookId));
      // console.log(booksObjectId);

      const query = { _id: { $in: booksObjectId } };

      const options = {
        // Sort returned documents in ascending order by title (A->Z)
        sort: { title: 1 },
        // Include only the `title` and `imdb` fields in each returned document
        projection: { _id: 1, title: 1, image: 1, category: 1, quantity: 1 },
      };

      try {
        const result = await bookCollection.find(query, options).toArray();
        // console.log(result);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(501)
          .json({ message: "Error Getting Data. Server Error Occurred!" });
      }
    });

    app.get("/bookDetails/:bookId", async (req, res) => {
      const id = req.params.bookId;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await bookCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(501)
          .json({ message: "Error fetching Data. Server Error Occurred!" });
      }
    });

    app.get("/borrowedBooks", verifyToken, async (req, res) => {
      const email = req.query?.email;
      // console.log(email);
      if (req.query?.email !== req.user?.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const filter = { email: email };
      const result = await borrowedCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/borrowedBooks/:id", verifyToken, async (req, res) => {
      const email = req.query?.email;
      const id = req.params.id;
      console.log("in borrowedBooks/:id", email);
      console.log("in borrowedBooks/:id", id);
      const query = { bookId: id, email: email };

      if (req.query?.email !== req.user?.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      try {
        const result = await borrowedCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(501)
          .json({ message: "Error getting Data. Server Error Occurred!" });
      }
    });

    app.post("/borrowed", async (req, res) => {
      const info = req.body;
      try {
        const result = await borrowedCollection.insertOne({
          ...info,
          createdAt: new Date(),
        });
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(501)
          .json({ message: "Error Creating Data. Server Error Occurred!" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) =>
  res.send("<h1><center>Hello from Server</center></h1>")
);

app.listen(port, () => {
  console.log(`Encyclopaedia Server running at ${port}`);
});
