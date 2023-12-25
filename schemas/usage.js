const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let usageSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: "Account",
    },
    row_id: String,
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

module.exports = mongoose.model("Usage", usageSchema);
