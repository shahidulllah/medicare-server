//Initial Declaration
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
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
     const campsCollection = client.db('campsDB').collection('camp');


    // CampData
    app.get('/camps', async(req, res) => {
        const result = await campsCollection.find().toArray();
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
