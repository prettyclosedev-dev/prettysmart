const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoose_delete = require("mongoose-delete");

const promptsSchema = new Schema({
    id: String,
    title: String,
    desc: String,
    category: String,
    prompt: String,
})

promptsSchema.plugin(mongoose_delete, { overrideMethods: "all" });

// create the model for users and expose it to our app
module.exports = mongoose.model("Prompts", promptsSchema);