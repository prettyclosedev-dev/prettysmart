const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoose_delete = require('mongoose-delete');

let fileSchema = new Schema({
    name : String,    
    user : {
        type: Schema.Types.ObjectId, 
        ref: 'User'
    },
    account : {
        type: Schema.Types.ObjectId, 
        ref: 'Account'
    },
    ext : String,
    type : String,
    created_at : {
        type : Number,
        default : Date.now
    },
    updated_at : Number
}, {
    timestamps : { 
        createdAt: 'created_at',
        updatedAt : 'updated_at'
    }
});


fileSchema.plugin(mongoose_delete, { overrideMethods: 'all' });

// create the model for users and expose it to our app
module.exports = mongoose.model('File', fileSchema);