//Initial Declaration
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qcso25z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    //Database Collection
    const usersCollection = client.db('campsDB').collection('user');
    const campsCollection = client.db('campsDB').collection('camp');
    const participantCollection = client.db('campsDB').collection('participant');
    const paymentCollection = client.db('campsDB').collection('payment');


    // users related api
    app.post('/users', async (req, res) => {
      const usersData = req.body;
      // validate Existing user
      const query = { email: usersData.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(usersData);
      res.send(result)
    })

    // Make Admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    // CampData
    app.get('/camps', async (req, res) => {
      const page = parseInt(req.query.page) || 0;
      const size = parseInt(req.query.size) || 10;
      const email = req.query.email;
      const query = email ? { email: email } : {};

      const totalCamps = await campsCollection.countDocuments(query);
      const camps = await campsCollection.find(query)
        .skip(page * size)
        .limit(size)
        .toArray();

      res.send({ totalCamps, camps });
    })

    // CampData by Id
    app.get('/camps/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campsCollection.findOne(query);
      res.send(result);
    })

    // Update Camp
    app.patch('/camps/:id', async (req, res) => {
      const camp = req.body;
      const id = req.params;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          CampName: camp.CampName,
          Image: camp.Image,
          CampFees: camp.CampFees,
          DateAndTime: camp.DateAndTime,
          Location: camp.Location,
          HealthcareProfessional: camp.HealthcareProfessional,
          ParticipantCount: camp.ParticipantCount,
          Description: camp.Description
        }
      }
      const result = await campsCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    //Delete Camps
    app.delete('/camps/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campsCollection.deleteOne(query);
      res.send(result);
    })

    //Post CampData by organizer
    app.post('/camps', async (req, res) => {
      const campData = req.body;
      console.log(campData);

      const result = await campsCollection.insertOne(campData);
      res.send(result)
    })


    // Post participant info
    app.post('/participants', async (req, res) => {
      const participantInfo = req.body;

      const result = await participantCollection.insertOne(participantInfo);
      res.send(result)
    })

    // Get participant info
    app.get('/participants', async (req, res) => {
      const result = await participantCollection.find().toArray();
      res.send(result);
    })

    // Payment Intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Payment related API
    app.post('/payments', async (req, res) => {
      const paymentData = req.body;

      const result = await paymentCollection.insertOne(paymentData);
      res.send(result)
    })

    // Get payment data
    app.get('/payments', async (req, res) => {

      const result = await paymentCollection.find().toArray();
      res.send(result);
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);

//Checking
app.get('/', (req, res) => {
  res.send('MIDICO SERVER IS RUNNING SUCCESSFULLY..!')
})

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`)
})
