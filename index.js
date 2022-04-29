import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();

const app = express(); // cria um servidor
app.use(cors());
app.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI);


app.post('/participants', async (req, res) => {

    const { name } = req.body;

    try {
        const result = await mongoClient.connect();
        const participantsCollection = mongoClient.db("batepapo-uol").collection("participants");
        const messagesCollection = mongoClient.db("batepapo-uol").collection("messages");

        // ... validar

        const participant = await participantsCollection.findOne({ name: name });

        await participantsCollection.insertOne({ name: name, lastStatus: Date.now() })
        await messagesCollection.insertOne({
            from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')
        })

        res.sendStatus(201)
        mongoClient.close();
    } catch (error) {
        res.status(500).send('erro :(');
        mongoClient.close();
    }
});

app.get('/participants', async (req, res) => {

    try {
        const result = await mongoClient.connect();
        const participantsCollection = mongoClient.db("batepapo-uol").collection("participants");
        const participants = await participantsCollection.find().toArray();
        res.send(participants)
        mongoClient.close();
    } catch (error) {
        res.status(500).send('erro :(');
        mongoClient.close();
    }
});

app.post('/messages', async (req, res) => {

    const { to, text, type } = req.body;
    const from = req.headers.user;

    try {
        const result = await mongoClient.connect();
        const participantsCollection = mongoClient.db("batepapo-uol").collection("participants");
        const messagesCollection = mongoClient.db("batepapo-uol").collection("messages");

        // ... validar

        await messagesCollection.insertOne({
            from: from, to: to, text: text, type: type, time: dayjs().format('HH:mm:ss')
        })

        res.sendStatus(201)
        mongoClient.close();
    } catch (error) {
        res.status(500).send('erro :(');
        mongoClient.close();
    }
});

app.get('/messages', async (req, res) => {

    const user = req.headers.user;
    const { limit } = req.query;

    try {
        const result = await mongoClient.connect();
        const messagesCollection = mongoClient.db("batepapo-uol").collection("messages");
        const messages = await messagesCollection.find().toArray();
        res.send(messages)
        mongoClient.close();
    } catch (error) {
        res.status(500).send('erro :(');
        mongoClient.close();
    }
});

app.post('/status', async (req, res) => {

    const { to, text, type } = req.body;
    const from = req.headers.user;

    try {
        const result = await mongoClient.connect();
        const participantsCollection = mongoClient.db("batepapo-uol").collection("participants");
        const messagesCollection = mongoClient.db("batepapo-uol").collection("messages");

        // ... validar

        await messagesCollection.insertOne({
            from: from, to: to, text: text, type: type, time: dayjs().format('HH:mm:ss')
        })

        res.sendStatus(201)
        mongoClient.close();
    } catch (error) {
        res.status(500).send('erro :(');
        mongoClient.close();
    }
});

app.listen(5000, () => console.log(`Vivo em http://localhost:5000!`));