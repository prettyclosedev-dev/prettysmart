const fs = require("fs") 
const config = require("../config.json")
const path = require("path")

const logDir = "../logs"

function logger(key, type, message) {
    const now = new Date()
    const date = `${now.getFullYear()}${now.getMonth()}${now.getDate()}`    
    const targetDir = path.join(__dirname, logDir, date)
    const targetFile = path.join(targetDir, `${key}.txt`)

    fs.mkdirSync(targetDir, {recursive: true})

    const formattedMessage = `[${now.toTimeString()} | ${type}]\n${message}\n\n`

    fs.appendFileSync(targetFile, formattedMessage)

    console.log(key, type, formattedMessage)
}

function logError(key, message) {
    if(typeof message === "object") {
        message = JSON.stringify(message);
    }
    

    logger(key, "ERROR", message)
}

function logMessage(key, message) {
    if(typeof message === "object") {
        message = JSON.stringify(message);
    }
    
    logger(key, "INFO", message)
}

module.exports = {
    logger,
    logMessage,
    logError
}