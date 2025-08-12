const fs = require("fs") 
const config = require("../config.json")
const path = require("path")

const logDir = "../logs"

function logger(userid, type, message) {
    const now = new Date()
    const date = `${now.getFullYear()}${now.getMonth()}${now.getDate()}`    
    const targetDir = path.join(__dirname, logDir, date)
    const targetFile = path.join(targetDir, `${userid}.txt`)

    fs.mkdirSync(targetDir, {recursive: true})

    const formattedMessage = `[${now.toTimeString()} | ${type}]\n${message}\n\n`

    fs.appendFileSync(targetFile, formattedMessage)

    console.log(userid, type, formattedMessage)
}

function logError(userid, message) {
    logger(userid, "ERROR", message)
}

function logMessage(userid, message) {
    logger(userid, "INFO", message)
}

module.exports = {
    logger,
    logMessage,
    logError
}