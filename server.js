const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// middlewares
app.use(
  cors({
    origin: ["*", "http://localhost:5173"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParser());

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
    await client.connect();

    const database = client.db("booksDB");

    const bookCollection = database.collection("books");
    const borrowedCollection = database.collection("borrowedBooks");

    //   routes
    app.get("/allBook", async (req, res) => {
      try {
        const result = await bookCollection.find().toArray();
        res.status(200).send(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error Fetching Books" });
      }
    });

    app.patch("/allBook/:id", async (req, res) => {
      const bookId = req.params.id;
      const quantity = req.body?.quantity;
      const filter = { _id: new ObjectId(bookId) };
      const updatedBook = {
        $set: {
          quantity: quantity,
        },
      };
      try {
        const result = await bookCollection.updateOne(filter, updatedBook);
        res.send(result);
      } catch (error) {
        console.log(error);
        res
          .status(501)
          .json({ message: "Error Updating Data. Server Error Occurred!" });
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
        projection: { _id: 1, title: 1, image: 1, category: 1 },
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

    app.get("/borrowedBooks", async (req, res) => {
      const email = req.query?.email;
      console.log(email);
      const filter = { email: email };
      const result = await borrowedCollection.find(filter).toArray();
      res.send(result);
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

app.listen(port, (req, res) => {
  console.log(`Encyclopaedia Server running at ${port}`);
});
