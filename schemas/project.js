const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoose_delete = require("mongoose-delete");

let projectSchema = new Schema(
  {
    project_title: String,
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: "Account",
    },
    project_id: String,
    template_id: String,
    custom_hash: String,
    // size: String,
    favorite: {
      type: Boolean,
      default: false,
    },
    thumbnail_url: String,
    created_at: {
      type: Number,
      default: Date.now,
    },
    updated_at: Number,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

projectSchema.plugin(mongoose_delete, { overrideMethods: "all" });

// create the model for users and expose it to our app
module.exports = mongoose.model("Project", projectSchema);
