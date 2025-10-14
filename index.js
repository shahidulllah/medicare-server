//Initial Declaration
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;
require("dotenv").config();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qcso25z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const campsDB = client.db("campsDB");
    //Database Collection
    const usersCollection = campsDB.collection("user");
    const campsCollection = campsDB.collection("camp");
    const participantCollection = campsDB.collection("participant");
    const paymentCollection = campsDB.collection("payment");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Middlewares of token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorize access" });
      }

      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorize Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";

      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    // users related api
    app.post("/users", async (req, res) => {
      const usersData = req.body;
      // validate Existing user
      const query = { email: usersData.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(usersData);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          name: user.name,
          email: user.email,
          photo: user.photo,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedUser);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    // Make Admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // CampData with pagination
    app.get("/camps", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const email = req.query.email;
      const query = email ? { email: email } : {};

      const totalCamps = await campsCollection.countDocuments(query);
      const camps = await campsCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();

      res.send({ totalCamps, camps });
    });

    // CampData by Id
    app.get("/camps/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campsCollection.findOne(query);
      res.send(result);
    });

    // Update Camp
    app.patch("/camps/:id", verifyToken, async (req, res) => {
      const camp = req.body;
      const id = req.params;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          CampName: camp.CampName,
          Image: camp.Image,
          CampFees: camp.CampFees,
          DateAndTime: camp.DateAndTime,
          Location: camp.Location,
          HealthcareProfessional: camp.HealthcareProfessional,
          ParticipantCount: camp.ParticipantCount,
          Description: camp.Description,
        },
      };
      const result = await campsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //Delete Camps
    app.delete("/camps/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campsCollection.deleteOne(query);
      res.send(result);
    });

    //Post CampData by organizer
    app.post("/camps", async (req, res) => {
      const campData = req.body;
      console.log(campData);

      const result = await campsCollection.insertOne(campData);
      res.send(result);
    });

    // Post participant info
    app.post("/participants", async (req, res) => {
      const participantInfo = req.body;

      const result = await participantCollection.insertOne(participantInfo);
      res.send(result);
    });

    // Get participant info
    app.get("/participants", async (req, res) => {
      const result = await participantCollection.find().toArray();
      res.send(result);
    });

    // Payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Payment related API
    app.post("/payments", async (req, res) => {
      const paymentData = req.body;

      const result = await paymentCollection.insertOne(paymentData);
      res.send(result);
    });

    // Get payment data
    app.get("/payments", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

//Checking
app.get("/", (req, res) => {
  res.send("MIDICO SERVER IS RUNNING SUCCESSFULLY..!");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
