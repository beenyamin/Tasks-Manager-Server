const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
        'http://localhost:5173',
    'https://task-management-3d313.web.app',
    'https://task-management-3d313.firebaseapp.com',
    
    ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rmje4mv.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// verifyToken
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('value of token in middleware:', token)
    if (!token) {
        return res.status(401).send({ massage: 'not authorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).send({ massage: 'unauthorized' })
        }
        console.log('value in the token', decoded)
        req.user = decoded;
        next()
    })

}




async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const TaskCollection = client.db('TasksDB').collection('usersTasks');

        // auth related api
        app.post('/user', async (req, res,) => {
            const user = req.body;
            // console.log(req.cookies.token)
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res
                .cookie('token', token, {
                    httpOnly: true ,
                    secure: true ,
                    sameSite: 'none'
                })
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })



        // Task Added api
        app.post('/newTask', async (req, res) => {
            const tasks = req.body;
            console.log(tasks);
            const result = await TaskCollection.insertOne(tasks);
            res.send(result);
        })


        app.get('/newTask', async (req, res) => {
            const cursor = TaskCollection.find();
            const result = await cursor.toArray();
            res.send(result)

        })

        // my posted task

        app.get('/myPostedTask',verifyToken, async (req, res) => {
            console.log('user', req.user?.email)
            console.log('query', req.query)

            if (req.query.email !== req.user.email) {
                return res.status(403).send({ massage: 'forbidden access ' })
            }

            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await TaskCollection.find(query).toArray();
            res.send(result)
        })

       


        app.delete('/Task/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await TaskCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/allTask', async (req, res) => {
            const cursor = TaskCollection.find();
            const result = await cursor.toArray();
            res.send(result)


        })


        app.get('/updateTask/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await TaskCollection.findOne(query)
            res.send(result);
        })



        app.put('/updateTask/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedTask = req.body;
            const posts = {
                $set: {
                    task: updatedTask.task,
                    description: updatedTask.description,
                    deadline: updatedTask.deadline,
                    priority: updatedTask.priority,
                    email: updatedTask.email
                }
            }
            const result = await TaskCollection.updateOne(filter, posts, options);
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
       
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('SERVER IS RUNNING!');
});


app.listen(port, () => {
    console.log(`Task Manager Server is running on port ${port}`);
})
