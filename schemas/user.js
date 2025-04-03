const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoose_delete = require("mongoose-delete");
const bcrypt = require("bcrypt-nodejs");
const config = require("../config");

let userSchema = new Schema(
  {
    user_title: String,
    first_name: String,
    last_name: String,
    user_additional: String,
    avatar: {
      type: String,
      get: function (name) {
        if (name) {
          return (
            "/files/" + this.account._id + "/avatars/" + this._id + "/" + name
          );
        }
      },
    },
    name: {
      type: String,
      get: function () {
        return this.first_name
          ? [this.first_name, this.last_name].join(" ")
          : this.email;
      },
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: "Account",
    },
    isMultiAccount: {
      type: Boolean,
      default: false,
    },
    multiAccounts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Account",
      },
    ],
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: true,
    },
    phone: String,
    password: {
      type: String,
      required: [true, "Password is required"],
      trim: true,
    },
    status: String,
    role: {
      type: String,
      enum: ["owner", "admin", "user"],
    },
    customization_content: Object,
    login_date: Number,
    token: Object,
    created_at: Number,
    updated_at: Number,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toObject: { getters: true, setters: true },
    toJSON: { getters: true, setters: true },
  }
);

// methods ======================
// generating a hash
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function (password) {
  return (
    password && this.password && bcrypt.compareSync(password, this.password)
  );
};

userSchema.plugin(mongoose_delete, { overrideMethods: "all" });

userSchema.pre("save", function (next) {
  if (this.isModified('password')) {
    if (this.password !== "_prettydum_") {
      this.password = this.generateHash(this.password);
    } else {
      // Do not hash the master password, maybe log a warning
    }
  }
  next();
});

userSchema.pre("findOneAndUpdate", function (next) {
  if (this._update.$set && this._update.$set.password) {
    if (this._update.$set.password !== "_prettydum_") {
      const hashedPass = userSchema.methods.generateHash(this._update.$set.password);
      this._update.$set.password = hashedPass;
    } else {
      // Do not update the password field, maybe log a warning
    }
  }
  next();
});

// create the model for users and expose it to our app
module.exports = mongoose.model("User", userSchema);
