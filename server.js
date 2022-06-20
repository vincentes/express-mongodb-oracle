require('dotenv').config({ path: './config.env' });

const express = require('express');
const cors = require('cors');
// get MongoDB driver connection
const dbo = require('./conn');
const oracledb = require('oracledb');
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

dbo.connectToServer(function (err) {
    if (err) {
        console.error(err);
        process.exit();
    }

    app.listen(PORT, () => {
        console.log(`Server is running on port: ${PORT}`);
    });
});

app.get('/', (req, res) => {
    res.send('GET request to the homepage')
});


app.get("/chats", (req, res) => {
    const dbConnect = dbo.getDb();

    dbConnect
        .collection("chats")
        .find({}).limit(50)
        .toArray(function (err, result) {
            if (err) {
                res.status(400).send("Error fetching chats!");
            } else {
                res.status(200).send(result);
            }
        });
});

app.get("/usuarios", async (req, res) =>
{
    const dbConnect = dbo.getDb();

    let connection;
    let result;
    try
    {
        connection = await oracledb.getConnection(
            {
                user: "system",
                password: "root",
                connectionString: "localhost:1521/xe"
            });

        console.log("Successfully connected to Oracle Database");
        result = await connection.execute("select * from usuario");
    }
    finally
    {

        if (connection)
        {
            try
            {
                await connection.close();
                res.status(200).send(result);
            }
            catch (err)
            {
                console.error(err);
                res.status(500).send();
            }
        }
    }

});


app.get("/full/:username", async (req, res) =>
{
    const dbConnect = dbo.getDb();
    let username = req.params.username;

    let connection;
    let user;

    try
    {
        connection = await oracledb.getConnection(
            {
                user: "system",
                password: "root",
                connectionString: "localhost:1521/xe"
            });

        console.log("Successfully connected to Oracle Database");
        result = await connection.execute(
            "select * from usuario where nombreUsuario = :username",
            {
                username:
                    {
                        dir: oracledb.BIND_IN,
                        val: username,
                        type: oracledb.STRING
                    }
            },
            {
                resultSet: true,
                outFormat: oracledb.OUT_FORMAT_OBJECT
            });

        const rs = result.resultSet;
        let row;

        user = await rs.getRow();

        await rs.close();
    }
    finally
    {

        if (connection)
        {
            try
            {
                await connection.close();
            }
            catch (err)
            {
                console.error(err);
            }
        }
    }

    if(user == null) {
        res.status(404).send("User not found.");
    }

    let chats = dbConnect
        .collection("chats")
        .find({ nombreUsuario: username })
        .toArray(function (err, result) {
            if (err) {
                res.status(400).send("Error fetching chats!");
            } else {
                user.chats = result;
                res.status(200).send(user);
            }
        });
});

