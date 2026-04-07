const express = require("express");

const app = express();


app.use(express.json());

app.get("/server", (req, res) => {

    return res.status(200).json({
        status: true,
        details: "Server is Up and Running"
    })
})

const PORT = "3000"
const HOSTNAME = "127.0.0.1"
const projectName = "Market-API"

app.listen(PORT, HOSTNAME, () => {
    console.log(`${projectName} is listening on http://${HOSTNAME}:${PORT}`)
})
