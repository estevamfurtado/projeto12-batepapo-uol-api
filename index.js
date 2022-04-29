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





// -------- Schemas

const nameSchema = joi.object({
    name: joi.string().required()
});

const lastStatusSchema = joi.object({
    lastStatus: joi.date().required()
});

const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    type: joi.any().valid('message', 'private_message').required(), //.valid(['message', 'private_message'])
    text: joi.string().required()
});





// -------- Requisições

// Participantes

app.post('/participants', async (req, res) => {

    const { name } = req.body;

    const validation = nameSchema.validate({ name }, { abortEarly: true });
    if (validation.error) {
        res.sendStatus(402);
        return;
    }

    try {
        const result = await mongoClient.connect();
        const participantsCollection = mongoClient.db("batepapo-uol").collection("participants");
        const messagesCollection = mongoClient.db("batepapo-uol").collection("messages");

        const participant = await participantsCollection.findOne({ name: name });

        if (participant) {
            res.sendStatus(402);
            mongoClient.close();
            return;
        }

        await participantsCollection.insertOne({ name: name, lastStatus: Date.now() })
        await messagesCollection.insertOne({
            from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201)
        mongoClient.close();

    } catch (error) {
        res.sendStatus(500);
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

// Mensagens

app.post('/messages', async (req, res) => {

    const { to, text, type } = req.body;
    const from = req.headers.user;

    const message = { from: from, to: to, text: text, type: type };
    const messageValidation = messageSchema.validate(message, { abortEarly: true });


    if (messageValidation.error) {
        res.sendStatus(422);
        return;
    }

    message.time = dayjs().format('HH:mm:ss');

    try {

        const result = await mongoClient.connect();
        const participantsCollection = mongoClient.db("batepapo-uol").collection("participants");
        const messagesCollection = mongoClient.db("batepapo-uol").collection("messages");

        const participants = await participantsCollection.find({ name: from }).toArray();

        if (participants.length === 0) {
            res.sendStatus(422);
            mongoClient.close();
            return;
        }

        await messagesCollection.insertOne(message);

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
    // console.log(`limit ${limit}`)

    try {
        const result = await mongoClient.connect();
        const messagesCollection = mongoClient.db("batepapo-uol").collection("messages");
        const messages = await messagesCollection.find().toArray();

        const myMessages = messages.filter(msg => {
            return ((msg.type === "message" || msg.type === "status") || (msg.from === user || msg.to === user));
        })

        let sendMessages = myMessages;

        if (limit) {
            sendMessages = myMessages.splice(myMessages.length - limit)
        }

        res.send(sendMessages)
        mongoClient.close();
    } catch (error) {
        res.status(500).send('erro :(');
        mongoClient.close();
    }
});

// Status

app.post('/status', async (req, res) => {

    const name = req.headers.user;
    const validation = nameSchema.validate({ name }, { abortEarly: true });
    if (validation.error) {
        res.sendStatus(402);
        return;
    }

    try {
        const result = await mongoClient.connect();
        const participantsCollection = mongoClient.db("batepapo-uol").collection("participants");

        let user = await participantsCollection.findOne({ name: name });

        if (!user) {
            res.sendStatus(404);
            mongoClient.close();
            return;
        }

        await participantsCollection.updateOne(
            { _id: user._id },
            { $set: { lastStatus: Date.now() } }
        )

        res.sendStatus(200);
        mongoClient.close();
    } catch (error) {
        res.status(500).send('erro :(');
        mongoClient.close();
    }
});




// -------- Remoção automática

setInterval(async () => {

    let participants = [];
    const participantsCollection = mongoClient.db("batepapo-uol").collection("participants");
    const messagesCollection = mongoClient.db("batepapo-uol").collection("messages");

    try {
        const connect = await mongoClient.connect();
        participants = await participantsCollection.find().toArray();
        // console.log(participants);
        mongoClient.close();

    } catch { mongoClient.close(); }

    // console.log(participants);

    participants.forEach(async (user) => {
        const now = Date.now();
        let timeToLast = now - user.lastStatus;
        if (timeToLast > 10000) {
            // console.log(`deletando ${user.name} ${user._id} (${timeToLast / 1000})`);

            try {
                const insideConnect = await mongoClient.connect();
                await participantsCollection.deleteOne({ _id: user._id });
                await messagesCollection.insertOne({ from: user.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss') });
                mongoClient.close();
            } catch {
                mongoClient.close();
            }
        }
    });

}, 15000);


app.listen(5000, () => console.log(`Vivo em http://localhost:5000!`));